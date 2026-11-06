import { describe, expect, it } from "vitest";
import { anchorPrice, bandTier, geupji, priceAtGeupji, rankStandings, TIERS } from "./tiers";

const EOK = 10000; // 1억 = 10,000만원
const ANCHOR = 50 * EOK;

const standings = (prices: Record<string, number | null>, anchors: string[] = [], challengers: string[] = []) =>
  rankStandings(
    Object.entries(prices).map(([key, eok]) => ({
      key,
      priceManwon: eok === null ? null : Math.round(eok * EOK),
      anchor: anchors.includes(key),
      challenger: challengers.includes(key),
    })),
  );

/** One region at a given 급지 against a lone 50억 anchor. */
const at = (g: number) => Math.round(priceAtGeupji(g, ANCHOR));
const alone = (g: number) =>
  rankStandings([
    { key: "anchor", priceManwon: ANCHOR, anchor: true },
    { key: "me", priceManwon: at(g) },
  ]).get("me")!;

describe("TIERS", () => {
  it("runs the League ladder from challenger down to iron", () => {
    expect(TIERS.map((t) => t.name)).toEqual([
      "챌린저",
      "그랜드마스터",
      "마스터",
      "다이아몬드",
      "에메랄드",
      "플래티넘",
      "골드",
      "실버",
      "브론즈",
      "아이언",
    ]);
    expect(TIERS.map((t) => t.level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("geupji", () => {
  it("is 1.0 at the anchor and never better", () => {
    expect(geupji(ANCHOR, ANCHOR)).toBe(1);
    expect(geupji(ANCHOR * 1.2, ANCHOR)).toBe(1);
  });

  it("grows with the log of the gap: half the anchor is 1 + 1.8 ln 2", () => {
    expect(geupji(ANCHOR / 2, ANCHOR)).toBeCloseTo(1 + 1.8 * Math.LN2, 10);
  });

  it("turns back into the same price", () => {
    expect(priceAtGeupji(geupji(123456, ANCHOR), ANCHOR)).toBeCloseTo(123456, 6);
  });
});

describe("anchorPrice", () => {
  it("averages the top three anchors and ignores the rest", () => {
    const entries = [
      { priceManwon: 60, anchor: true },
      { priceManwon: 50, anchor: true },
      { priceManwon: 40, anchor: true },
      { priceManwon: 10, anchor: true },
      { priceManwon: 99, anchor: false },
    ];
    expect(anchorPrice(entries)).toBe(50);
  });

  it("falls back to every entry when no anchor has a price", () => {
    expect(anchorPrice([{ priceManwon: null, anchor: true }, { priceManwon: 12 }])).toBe(12);
  });

  it("counts every entry when none is marked, and is null with no price", () => {
    expect(anchorPrice([{ priceManwon: 30 }, { priceManwon: 10 }])).toBe(20);
    expect(anchorPrice([{ priceManwon: null }])).toBeNull();
  });
});

describe("bandTier", () => {
  it("counts a 급지 exactly on a bound as the better tier", () => {
    expect(bandTier(2.1).id).toBe("master");
    expect(bandTier(2.11).id).toBe("diamond");
  });

  it("places 급지 by bound: 2.4 diamond, 2.8 emerald, 3.2 platinum, 3.6 gold, 4.0 silver, 4.4 bronze", () => {
    expect([2.4, 2.8, 3.2, 3.6, 4.0, 4.4, 4.41].map((g) => bandTier(g).id)).toEqual([
      "diamond",
      "emerald",
      "platinum",
      "gold",
      "silver",
      "bronze",
      "iron",
    ]);
  });

  it("never hands out an apex seat by 급지 alone", () => {
    expect(bandTier(1).id).toBe("master");
  });
});

describe("rankStandings", () => {
  it("ranks by price, highest first, and leaves unpriced entries out", () => {
    const s = standings({ mapo: 23.4, banpo: 53.9, empty: null, jamsil: 32.1 });

    expect([...s.entries()].map(([key, v]) => [key, v.rank])).toEqual([
      ["banpo", 1],
      ["jamsil", 2],
      ["mapo", 3],
    ]);
  });

  it("breaks a price tie by key so the order is stable", () => {
    const s = standings({ b: 20, a: 20 });

    expect(s.get("a")?.rank).toBe(1);
    expect(s.get("b")?.rank).toBe(2);
  });

  it("measures 급지 against the anchors only", () => {
    const s = standings({ banpo: 50, songdo: 12 }, ["banpo"]);

    expect(s.get("songdo")).toMatchObject({ tier: { id: "gold" }, anchorManwon: ANCHOR });
    expect(s.get("songdo")!.geupji).toBeCloseTo(1 + 1.8 * Math.log(50 / 12), 10);
  });

  it("keeps the tiers when the whole market rises together", () => {
    const before = standings({ banpo: 50, mapo: 28, songdo: 12 }, ["banpo"]);
    const after = standings({ banpo: 65, mapo: 36.4, songdo: 15.6 }, ["banpo"]);

    for (const key of ["banpo", "mapo", "songdo"]) {
      expect(after.get(key)?.tier.id).toBe(before.get(key)?.tier.id);
      expect(after.get(key)?.geupji).toBeCloseTo(before.get(key)!.geupji, 10);
    }
  });

  it("with no 강남 3구 flagged, seats one challenger and two grandmasters inside 2.1급지; the rest there stay master", () => {
    const s = standings({ a: 50, b: 45, c: 42, d: 40 });

    expect(["a", "b", "c", "d"].map((k) => s.get(k)?.tier.id)).toEqual([
      "challenger",
      "grandmaster",
      "grandmaster",
      "master",
    ]);
  });

  it("keeps a grandmaster seat empty rather than seat a region past 2.1급지", () => {
    expect(standings({ banpo: 50, songdo: 12 }, ["banpo"]).get("songdo")?.tier.id).toBe("gold");
    expect(alone(2.11).tier.id).toBe("diamond");
  });

  it("splits a tier into divisions IV–I and counts LP inside the division", () => {
    // diamond 2.1–2.4급지 in 0.075 steps: 2.22 sits in II, 40% of the way to I
    expect(alone(2.22)).toMatchObject({ tier: { id: "diamond" }, division: 2, lp: 39 });
  });

  it("starts a tier at division IV with 0 LP", () => {
    expect(alone(2.3999)).toMatchObject({ tier: { id: "diamond" }, division: 4, lp: 0 });
  });

  it("puts anything past 4.8급지 at Iron IV, 0 LP", () => {
    expect(alone(5.2)).toMatchObject({ tier: { id: "iron" }, division: 4, lp: 0 });
  });

  it("gives apex tiers no division and one LP per 100만원 over master's floor", () => {
    expect(rankStandings([{ key: "a", priceManwon: ANCHOR }]).get("a")).toMatchObject({ division: null, lp: 2286 });
    expect(alone(1.5)).toMatchObject({ tier: { id: "grandmaster" }, division: null, lp: 1073 });
  });

  it("measures the climb to the next division floor", () => {
    // Diamond II → Diamond I at 2.175급지
    expect(alone(2.22).toNext).toBe(6427);
  });

  it("measures division I's climb to the next tier's floor", () => {
    expect(alone(2.13).toNext).toBe(4486);
  });

  it("measures master's climb to the lowest grandmaster", () => {
    expect(standings({ a: 50, b: 45, c: 42, d: 40 }).get("d")?.toNext).toBe(420000 - 400000);
  });

  it("measures a grandmaster's climb to the challenger's price", () => {
    expect(standings({ a: 50, b: 45, c: 42, d: 40 }).get("c")?.toNext).toBe(500000 - 420000);
  });

  it("has nothing left to climb for the challenger", () => {
    expect(standings({ banpo: 53.9 }).get("banpo")?.toNext).toBeNull();
  });
});

describe("rankStandings with 강남 3구", () => {
  // 2026-09 real prices: 성수 sits above 대치·개포·잠실 by price
  const PRICES = { banpo: 58.5, seongsu: 46.5, daechi: 43.45, gaepo: 37.1, jamsil: 34.9, gangdong: 30, yongsan: 28 };
  const SEOUL = Object.keys(PRICES);
  const G3 = ["banpo", "daechi", "gaepo", "jamsil"];
  const s = () => standings(PRICES, SEOUL, G3);

  it("makes every 강남 3구 region challenger, whatever its price", () => {
    expect(G3.map((k) => s().get(k)?.tier.id)).toEqual(["challenger", "challenger", "challenger", "challenger"]);
  });

  it("keeps a 강남 3구 region challenger even far down the ladder", () => {
    expect(standings({ banpo: 50, jamsil: 10 }, ["banpo"], ["banpo", "jamsil"]).get("jamsil")?.tier.id).toBe("challenger");
  });

  it("never seats a region outside 강남 3구 as challenger; the next two by price take grandmaster", () => {
    expect(["seongsu", "gangdong", "yongsan"].map((k) => s().get(k)?.tier.id)).toEqual(["grandmaster", "grandmaster", "master"]);
  });

  it("ranks by tier first, then price", () => {
    expect(["banpo", "daechi", "gaepo", "jamsil", "seongsu", "gangdong", "yongsan"].map((k) => s().get(k)?.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("has a grandmaster climb to the grandmaster above, and nothing for the top one", () => {
    expect(s().get("seongsu")?.toNext).toBeNull();
    expect(s().get("gangdong")?.toNext).toBe(465000 - 300000);
    expect(s().get("yongsan")?.toNext).toBe(300000 - 280000);
  });

  it("has nothing to climb for any challenger", () => {
    expect(G3.map((k) => s().get(k)?.toNext)).toEqual([null, null, null, null]);
  });
});
