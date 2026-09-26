import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runIngest } from "./run";
import { MolitApiError, type RawTradeItem } from "@/lib/molit/parse";
import type { FetchTarget } from "@/lib/molit/plan";
import type { RegionDef } from "@/data/regions";
import { resetDb, testPrisma } from "@/test/db";

const db = testPrisma();

const JAMSIL: RegionDef = {
  slug: "jamsil",
  name: "잠실",
  area: "서울 송파구",
  sido: "서울",
  districts: [{ code: "11710" }],
  dongs: ["잠실동"],
};

const raw = (dealDay: string, dealAmount: string): RawTradeItem => ({
  aptDong: "",
  aptNm: "잠실엘스",
  aptSeq: "11710-1",
  buildYear: "2008",
  buyerGbn: "개인",
  cdealDay: "",
  cdealType: "",
  dealAmount,
  dealDay,
  dealMonth: "9",
  dealYear: "2026",
  dealingGbn: "중개거래",
  excluUseAr: "84.8",
  floor: "12",
  jibun: "19",
  rgstDate: "",
  roadNm: "",
  sggCd: "11710",
  slerGbn: "개인",
  umdNm: "잠실동",
});

const answers = (table: Record<string, RawTradeItem[] | Error>) => async (target: FetchTarget) => {
  const answer = table[`${target.code}:${target.ym}`] ?? [];
  if (answer instanceof Error) throw answer;
  return answer;
};

beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

describe("runIngest", () => {
  it("fetches the plan, stores trades and publishes the edition", async () => {
    const { run, edition } = await runIngest(db, {
      kind: "daily",
      regions: [JAMSIL],
      fromYm: "202609",
      toYm: "202609",
      asOf: "2026-09-26",
      fetcher: answers({ "11710:202609": [raw("20", "305,000"), raw("10", "300,000")] }),
    });

    expect(run).toMatchObject({ status: "ok", requests: 1, fetched: 2, inserted: 2 });
    expect(edition.number).toBe(1);
  });

  it("finishes as partial and queues a failed month for the next run", async () => {
    const { run } = await runIngest(db, {
      kind: "daily",
      regions: [JAMSIL],
      fromYm: "202608",
      toYm: "202609",
      asOf: "2026-09-26",
      fetcher: answers({ "11710:202608": new Error("HTTP 503"), "11710:202609": [raw("20", "305,000")] }),
    });

    expect(run.status).toBe("partial");
    expect(await db.pendingFetch.findMany()).toMatchObject([{ code: "11710", ym: "202608", attempts: 1 }]);
  });

  it("retries queued months on the next run and clears them once fetched", async () => {
    await db.pendingFetch.create({ data: { code: "11710", ym: "202601", attempts: 1, lastError: "HTTP 503" } });

    const asked: string[] = [];
    const fetcher = async (t: FetchTarget) => {
      asked.push(`${t.code}:${t.ym}`);
      return [];
    };
    await runIngest(db, { kind: "daily", regions: [JAMSIL], fromYm: "202609", toYm: "202609", asOf: "2026-09-26", fetcher });

    expect(asked).toEqual(["11710:202601", "11710:202609"]);
    expect(await db.pendingFetch.count()).toBe(0);
  });

  it("stops at once on a key error instead of hammering every month", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      throw new MolitApiError("SERVICE_KEY_IS_NOT_REGISTERED_ERROR", "30");
    };

    await expect(
      runIngest(db, { kind: "daily", regions: [JAMSIL], fromYm: "202607", toYm: "202609", asOf: "2026-09-26", fetcher }),
    ).rejects.toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/);
    expect(calls).toBe(1);
    expect(await db.ingestRun.findFirstOrThrow()).toMatchObject({ status: "failed" });
  });
});
