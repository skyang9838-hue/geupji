import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publishEdition } from "./edition";
import { applyTrades } from "./store";
import { keyTrades } from "@/lib/molit/dedupe";
import type { NormalizedTrade } from "@/lib/molit/normalize";
import type { EditionEvent } from "@/lib/stats/events";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
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

const trade = (dealDate: string, priceManwon: number, over: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  aptSeq: "11710-1",
  aptName: "잠실엘스",
  sggCd: "11710",
  umdName: "잠실동",
  jibun: "19",
  roadName: null,
  buildYear: 2008,
  dealDate,
  areaM2: 84.8,
  floor: 12,
  priceManwon,
  dealingType: "중개거래",
  buyerType: "개인",
  sellerType: "개인",
  cancelled: false,
  cancelledOn: null,
  registeredOn: null,
  aptDong: null,
  ...over,
});

const noRun = { insertedIds: [], newlyCancelled: [] };

beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

describe("publishEdition", () => {
  it("publishes edition no. 1 with a snapshot for every region", async () => {
    await applyTrades(db, keyTrades([trade("2026-09-20", 295000), trade("2026-09-01", 290000, { floor: 3 })]));

    const edition = await publishEdition(db, { asOf: "2026-09-26", regions: [JAMSIL], run: noRun });

    expect(edition.number).toBe(1);
    const snapshots = edition.snapshots as unknown as RegionSnapshot[];
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      regionSlug: "jamsil",
      leader: { name: "잠실엘스" },
      standing: { rank: 1, tier: { id: "diamond" }, division: 1 },
    });
  });

  it("keeps the monthly ladder and this year's season with each snapshot", async () => {
    await applyTrades(db, keyTrades([trade("2026-09-20", 295000), trade("2026-09-01", 290000, { floor: 3 })]));

    const edition = await publishEdition(db, { asOf: "2026-09-26", regions: [JAMSIL], run: noRun });

    const [snap] = edition.snapshots as unknown as RegionSnapshot[];
    expect(snap.ladder).toHaveLength(69);
    expect(snap.ladder.at(-1)).toEqual({ ym: "202609", rank: 1, level: 3 });
    expect(snap.seasons).toEqual([{ year: 2026, level: 3, division: 1, priceManwon: 292500 }]);
  });

  it("reprints the same day's edition under the same number", async () => {
    await applyTrades(db, keyTrades([trade("2026-09-20", 295000)]));
    await publishEdition(db, { asOf: "2026-09-26", regions: [JAMSIL], run: noRun });

    const reprint = await publishEdition(db, { asOf: "2026-09-26", regions: [JAMSIL], run: noRun });

    expect(reprint.number).toBe(1);
    expect(await db.edition.count()).toBe(1);
  });

  it("reports a promotion against the previous day's edition", async () => {
    await applyTrades(db, keyTrades([trade("2026-09-10", 295000), trade("2026-09-01", 295000, { floor: 3 })]));
    await publishEdition(db, { asOf: "2026-09-25", regions: [JAMSIL], run: noRun });

    const inserted = await applyTrades(
      db,
      keyTrades([trade("2026-09-24", 320000, { floor: 20 }), trade("2026-09-23", 318000, { floor: 18 })]),
    );
    const next = await publishEdition(db, {
      asOf: "2026-09-26",
      regions: [JAMSIL],
      run: { insertedIds: inserted.insertedIds, newlyCancelled: [] },
    });

    expect(next.number).toBe(2);
    const events = next.events as unknown as EditionEvent[];
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["TIER_UP", "NEW_TRADE", "NEW_HIGH"]));
    expect(events.find((e) => e.type === "TIER_UP")).toMatchObject({ fromLevel: 3, toLevel: 2 });
  });

  it("does not report old trades that a backfill found as today's news", async () => {
    const backfill = await applyTrades(
      db,
      keyTrades([trade("2021-10-01", 250000), trade("2026-06-01", 280000, { floor: 3 }), trade("2026-09-20", 300000, { floor: 5 })]),
    );

    const edition = await publishEdition(db, {
      asOf: "2026-09-26",
      regions: [JAMSIL],
      run: { insertedIds: backfill.insertedIds, newlyCancelled: [] },
    });

    const trades = (edition.events as unknown as EditionEvent[]).filter((e) => e.type === "NEW_TRADE");
    expect(trades.map((e) => (e as { dealDate: string }).dealDate)).toEqual(["2026-09-20"]);
  });

  it("keeps the morning's events when the evening run reprints the edition", async () => {
    await applyTrades(db, keyTrades([trade("2025-09-10", 280000)]));
    const morning = await applyTrades(db, keyTrades([trade("2026-09-24", 300000, { floor: 20 })]));
    await publishEdition(db, {
      asOf: "2026-09-26",
      regions: [JAMSIL],
      run: { insertedIds: morning.insertedIds, newlyCancelled: [] },
    });

    const evening = await publishEdition(db, { asOf: "2026-09-26", regions: [JAMSIL], run: noRun });

    const events = evening.events as unknown as EditionEvent[];
    expect(events.filter((e) => e.type === "NEW_TRADE")).toHaveLength(1);
    expect(events.filter((e) => e.type === "NEW_HIGH")).toHaveLength(1);
  });
});
