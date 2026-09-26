import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { applyTrades, reconcileRemoved, tradeKey } from "./store";
import { keyTrades } from "@/lib/molit/dedupe";
import type { NormalizedTrade } from "@/lib/molit/normalize";
import { resetDb, testPrisma } from "@/test/db";

const db = testPrisma();

const trade = (over: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  aptSeq: "11710-1",
  aptName: "잠실엘스",
  sggCd: "11710",
  umdName: "잠실동",
  jibun: "19",
  roadName: "올림픽로 99",
  buildYear: 2008,
  dealDate: "2026-09-20",
  areaM2: 84.8,
  floor: 12,
  priceManwon: 305000,
  dealingType: "중개거래",
  buyerType: "개인",
  sellerType: "개인",
  cancelled: false,
  cancelledOn: null,
  registeredOn: null,
  aptDong: null,
  ...over,
});

beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

describe("applyTrades", () => {
  it("stores new trades with their complex and reports their ids", async () => {
    const result = await applyTrades(db, keyTrades([trade(), trade({ priceManwon: 300000, floor: 3 })]));

    expect(result.insertedIds).toHaveLength(2);
    const complex = await db.complex.findUniqueOrThrow({ where: { aptSeq: "11710-1" } });
    expect(complex).toMatchObject({ name: "잠실엘스", umdName: "잠실동", buildYear: 2008 });
    expect(await db.trade.count()).toBe(2);
  });

  it("stores nothing new when the same month arrives again", async () => {
    await applyTrades(db, keyTrades([trade()]));

    const again = await applyTrades(db, keyTrades([trade()]));

    expect(again.insertedIds).toEqual([]);
    expect(again.updated).toBe(0);
    expect(await db.trade.count()).toBe(1);
  });

  it("records a cancellation and reports it as newly cancelled", async () => {
    await applyTrades(db, keyTrades([trade()]));

    const later = await applyTrades(db, keyTrades([trade({ cancelled: true, cancelledOn: "2026-09-25" })]));

    expect(later.newlyCancelled).toHaveLength(1);
    expect(later.newlyCancelled[0].cancelledOn).toBe("2026-09-25");
    const stored = await db.trade.findFirstOrThrow();
    expect(stored.cancelled).toBe(true);
  });

  it("moves a trade to the new district code instead of duplicating it", async () => {
    await applyTrades(db, keyTrades([trade({ sggCd: "41590", umdName: "오산동" })]));

    await applyTrades(db, keyTrades([trade({ sggCd: "41597", umdName: "여울동" })]));

    expect(await db.trade.count()).toBe(1);
    expect((await db.trade.findFirstOrThrow()).sggCd).toBe("41597");
    expect((await db.complex.findFirstOrThrow()).umdName).toBe("여울동");
  });
});

describe("reconcileRemoved", () => {
  it("marks trades missing from a refetched month and restores them if they come back", async () => {
    const kept = trade();
    const dropped = trade({ priceManwon: 111111, floor: 2 });
    await applyTrades(db, keyTrades([kept, dropped]));

    const refetch = keyTrades([kept]);
    await applyTrades(db, refetch);
    const removed = await reconcileRemoved(db, [{ code: "11710", ym: "202609" }], new Set(refetch.map(tradeKey)));

    expect(removed).toBe(1);
    expect((await db.trade.findFirstOrThrow({ where: { priceManwon: 111111 } })).removedAt).not.toBeNull();

    await applyTrades(db, keyTrades([kept, dropped]));
    expect((await db.trade.findFirstOrThrow({ where: { priceManwon: 111111 } })).removedAt).toBeNull();
  });

  it("leaves alone a trade seen under another code in the same run", async () => {
    const moved = trade({ sggCd: "41590" });
    await applyTrades(db, keyTrades([moved]));

    const underNewCode = keyTrades([trade({ sggCd: "41597" })]);
    await applyTrades(db, underNewCode);
    const removed = await reconcileRemoved(db, [{ code: "41590", ym: "202609" }], new Set(underNewCode.map(tradeKey)));

    expect(removed).toBe(0);
  });
});
