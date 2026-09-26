import { describe, expect, it } from "vitest";
import { fetchMonth, ENDPOINT } from "./client";
import { MolitApiError } from "./parse";

const item = (price: string) =>
  `<item><aptNm>A</aptNm><aptSeq>11710-1</aptSeq><dealAmount>${price}</dealAmount></item>`;

const page = (items: string[], totalCount: number, pageNo: number) =>
  `<?xml version="1.0" encoding="utf-8"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>` +
  `<body><items>${items.join("")}</items><numOfRows>2</numOfRows><pageNo>${pageNo}</pageNo><totalCount>${totalCount}</totalCount></body></response>`;

/** A stand-in for global fetch that answers from a queue and records the URLs asked. */
function transport(responses: Array<() => Response>) {
  const urls: URL[] = [];
  const impl = async (input: string | URL) => {
    urls.push(new URL(String(input)));
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra request");
    return next();
  };
  return { impl, urls };
}

const ok = (body: string) => () => new Response(body, { status: 200 });
const noSleep = async () => {};

describe("fetchMonth", () => {
  it("asks the trade endpoint with the key, district and month", async () => {
    const { impl, urls } = transport([ok(page([item("1")], 1, 1))]);

    await fetchMonth({ code: "11710", ym: "202609" }, { serviceKey: "k+/=ey", fetchImpl: impl, sleep: noSleep });

    expect(urls[0].origin + urls[0].pathname).toBe(ENDPOINT);
    expect(urls[0].searchParams.get("serviceKey")).toBe("k+/=ey");
    expect(urls[0].searchParams.get("LAWD_CD")).toBe("11710");
    expect(urls[0].searchParams.get("DEAL_YMD")).toBe("202609");
    expect(urls[0].searchParams.get("pageNo")).toBe("1");
  });

  it("walks the pages until totalCount items are in hand", async () => {
    const { impl, urls } = transport([
      ok(page([item("1"), item("2")], 3, 1)),
      ok(page([item("3")], 3, 2)),
    ]);

    const items = await fetchMonth(
      { code: "11710", ym: "202609" },
      { serviceKey: "k", fetchImpl: impl, sleep: noSleep, numOfRows: 2 },
    );

    expect(items.map((i) => i.dealAmount)).toEqual(["1", "2", "3"]);
    expect(urls.map((u) => u.searchParams.get("pageNo"))).toEqual(["1", "2"]);
  });

  it("retries a temporary server error", async () => {
    const { impl } = transport([() => new Response("busy", { status: 503 }), ok(page([item("1")], 1, 1))]);

    const items = await fetchMonth({ code: "11710", ym: "202609" }, { serviceKey: "k", fetchImpl: impl, sleep: noSleep });

    expect(items).toHaveLength(1);
  });

  it("gives up after the last retry", async () => {
    const busy = () => new Response("busy", { status: 503 });
    const { impl } = transport([busy, busy, busy]);

    await expect(
      fetchMonth({ code: "11710", ym: "202609" }, { serviceKey: "k", fetchImpl: impl, sleep: noSleep, retries: 2 }),
    ).rejects.toThrow(/503/);
  });

  it("does not retry a key or parameter error", async () => {
    const auth =
      "<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg>" +
      "<returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode>" +
      "</cmmMsgHeader></OpenAPI_ServiceResponse>";
    const { impl, urls } = transport([ok(auth)]);

    await expect(
      fetchMonth({ code: "11710", ym: "202609" }, { serviceKey: "k", fetchImpl: impl, sleep: noSleep }),
    ).rejects.toBeInstanceOf(MolitApiError);
    expect(urls).toHaveLength(1);
  });
});
