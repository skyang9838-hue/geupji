import { describe, expect, it } from "vitest";
import { cancellationEvents, tierEvents, tradeEvents } from "./events";
import type { StatTrade } from "./representative";
import type { RegionSnapshot } from "./snapshot";
import { rankStandings } from "./tiers";

const t = (dealDate: string, priceManwon: number, over: Partial<StatTrade> = {}): StatTrade => ({
  dealDate,
  priceManwon,
  areaM2: 84.97,
  floor: 12,
  dealingType: "중개거래",
  cancelled: false,
  removed: false,
  ...over,
});

const snap = (regionSlug: string, priceManwon: number | null): RegionSnapshot => ({
  regionSlug,
  leader: priceManwon === null ? null : { aptSeq: "1", name: "대장", buildYear: 2010 },
  rep:
    priceManwon === null
      ? null
      : { priceManwon, windowDays: 90, count: 3, stale: false, lastDealDate: "2026-09-20" },
  change3m: null,
  peak: null,
  vsPeak: null,
  high: null,
  contenders: [],
  history: [],
  standing: priceManwon === null ? null : rankStandings([{ key: regionSlug, priceManwon }]).get(regionSlug)!,
  ladder: [],
  seasons: [],
});

const leader = { aptSeq: "11710-1", name: "잠실엘스" };

describe("tierEvents", () => {
  it("reports a promotion when the tier level falls (diamond → master)", () => {
    const events = tierEvents(new Map([["jamsil", 3]]), [snap("jamsil", 305000)]);

    expect(events).toEqual([
      { type: "TIER_UP", regionSlug: "jamsil", fromLevel: 3, toLevel: 2, priceManwon: 305000 },
    ]);
  });

  it("reports a demotion when the tier level rises (master → diamond)", () => {
    const events = tierEvents(new Map([["jamsil", 2]]), [snap("jamsil", 295000)]);

    expect(events[0]).toMatchObject({ type: "TIER_DOWN", fromLevel: 2, toLevel: 3 });
  });

  it("stays quiet for an unchanged tier, a new region, or a region that lost its price", () => {
    const events = tierEvents(new Map([["jamsil", 2], ["mapo", 3]]), [
      snap("jamsil", 305000),
      snap("mapo", null),
      snap("songdo", 100000),
    ]);

    expect(events).toEqual([]);
  });
});

describe("tradeEvents", () => {
  it("announces every new trade of the leader, marking whether it is the reference size", () => {
    const small = t("2026-09-20", 200000, { areaM2: 59.9 });
    const events = tradeEvents("jamsil", leader, [small], [small]);

    expect(events).toEqual([
      {
        type: "NEW_TRADE",
        regionSlug: "jamsil",
        aptSeq: "11710-1",
        aptName: "잠실엘스",
        priceManwon: 200000,
        dealDate: "2026-09-20",
        floor: 12,
        areaM2: 59.9,
        dealingType: "중개거래",
        base: false,
      },
    ]);
  });

  it("adds a record event when a new reference-size trade beats the old high", () => {
    const deal = t("2026-09-20", 320000);
    const events = tradeEvents("jamsil", leader, [deal], [t("2021-10-01", 300000), deal]);

    expect(events.map((e) => e.type)).toEqual(["NEW_TRADE", "NEW_HIGH"]);
    expect(events[1]).toMatchObject({ type: "NEW_HIGH", priceManwon: 320000, previousHigh: 300000 });
  });

  it("does not announce a trade that arrived already cancelled", () => {
    const deal = t("2026-09-20", 320000, { cancelled: true });

    expect(tradeEvents("jamsil", leader, [deal], [deal])).toEqual([]);
  });
});

describe("cancellationEvents", () => {
  it("reports a cancelled deal that had set a record", () => {
    const deal = t("2026-09-01", 330000, { cancelled: true });
    const events = cancellationEvents("jamsil", leader, [{ trade: deal, cancelledOn: "2026-09-25" }], [
      t("2025-12-01", 300000),
      deal,
    ]);

    expect(events).toEqual([
      {
        type: "HIGH_CANCELLED",
        regionSlug: "jamsil",
        aptSeq: "11710-1",
        aptName: "잠실엘스",
        priceManwon: 330000,
        dealDate: "2026-09-01",
        cancelledOn: "2026-09-25",
        previousHigh: 300000,
      },
    ]);
  });

  it("ignores a cancelled deal that was below the record", () => {
    const deal = t("2026-09-01", 290000, { cancelled: true });

    expect(
      cancellationEvents("jamsil", leader, [{ trade: deal, cancelledOn: "2026-09-25" }], [t("2025-12-01", 300000), deal]),
    ).toEqual([]);
  });
});
