import { describe, expect, it } from "vitest";
import { rankEdition } from "./ladder";
import type { RegionFacts } from "./snapshot";

const EOK = 10000;

const facts = (regionSlug: string, eok: number | null, history: Record<string, number | null> = {}): RegionFacts => ({
  regionSlug,
  leader: eok === null ? null : { aptSeq: `${regionSlug}-1`, name: `${regionSlug} 대장`, buildYear: 2010 },
  rep: eok === null ? null : { priceManwon: eok * EOK, windowDays: 90, count: 3, stale: false, lastDealDate: "2026-01-20" },
  change3m: null,
  peak: null,
  vsPeak: null,
  high: null,
  contenders: [],
  history: Object.entries(history).map(([ym, v]) => ({ ym, priceManwon: v === null ? null : v * EOK })),
});

describe("rankEdition", () => {
  it("gives each region its standing in today's ranking", () => {
    const [banpo, jamsil] = rankEdition([facts("banpo", 53.9), facts("jamsil", 32.1)]);

    expect(banpo.standing).toMatchObject({ rank: 1, tier: { id: "challenger" } });
    expect(jamsil.standing).toMatchObject({ rank: 2, tier: { id: "master" } });
  });

  it("records every month's rank and tier", () => {
    const [a] = rankEdition([
      facts("a", 31, { "202512": 30, "202601": 31 }),
      facts("b", 29, { "202512": 32, "202601": 29 }),
    ]);

    expect(a.ladder).toEqual([
      { ym: "202512", rank: 2, level: 2 },
      { ym: "202601", rank: 1, level: 2 },
    ]);
  });

  it("closes each season with the tier held in its last month", () => {
    const [a] = rankEdition([facts("a", 31, { "202511": 26, "202512": 30, "202601": 31 })]);

    expect(a.seasons).toEqual([
      { year: 2025, level: 2, division: null, priceManwon: 300000 },
      { year: 2026, level: 2, division: null, priceManwon: 310000 },
    ]);
  });

  it("leaves months, seasons and today unranked where a region has no price", () => {
    const [, empty] = rankEdition([facts("a", 31, { "202512": 30 }), facts("empty", null, { "202512": null })]);

    expect(empty.standing).toBeNull();
    expect(empty.ladder).toEqual([{ ym: "202512", rank: null, level: null }]);
    expect(empty.seasons).toEqual([]);
  });

  it("ranks every region over the same months even when one has no history", () => {
    const [none, a] = rankEdition([facts("none", null), facts("a", 31, { "202512": 30 })]);

    expect(none.ladder).toEqual([{ ym: "202512", rank: null, level: null }]);
    expect(a.ladder).toEqual([{ ym: "202512", rank: 1, level: 2 }]);
  });
});
