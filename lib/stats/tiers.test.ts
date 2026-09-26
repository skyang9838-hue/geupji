import { describe, expect, it } from "vitest";
import { bandTier, rankStandings, TIERS } from "./tiers";

const EOK = 10000; // 1억 = 10,000만원

const standings = (prices: Record<string, number | null>) =>
  rankStandings(Object.entries(prices).map(([key, eok]) => ({ key, priceManwon: eok === null ? null : Math.round(eok * EOK) })));

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

describe("bandTier", () => {
  it("counts a price exactly on a floor as the higher tier", () => {
    expect(bandTier(30 * EOK).id).toBe("master");
    expect(bandTier(30 * EOK - 1).id).toBe("diamond");
  });

  it("places prices by floor: 25억 diamond, 20억 emerald, 16억 platinum, 12억 gold, 9억 silver, 6억 bronze", () => {
    expect([25, 20, 16, 12, 9, 6, 5.9].map((e) => bandTier(e * EOK).id)).toEqual([
      "diamond",
      "emerald",
      "platinum",
      "gold",
      "silver",
      "bronze",
      "iron",
    ]);
  });

  it("never hands out an apex seat by price alone", () => {
    expect(bandTier(80 * EOK).id).toBe("master");
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

  it("seats the single challenger: first place, at 50억 or more", () => {
    const s = standings({ banpo: 53.9, apgujeong: 52 });

    expect(s.get("banpo")?.tier.id).toBe("challenger");
    expect(s.get("apgujeong")?.tier.id).toBe("grandmaster");
  });

  it("leaves the throne empty when first place is under 50억", () => {
    const s = standings({ banpo: 48, daechi: 38 });

    expect(s.get("banpo")?.tier.id).toBe("grandmaster");
    expect(s.get("daechi")?.tier.id).toBe("grandmaster");
  });

  it("fills two grandmaster seats from 35억; the rest of 30억+ stay master", () => {
    const s = standings({ banpo: 53.9, daechi: 38.9, gaepo: 36.8, apgujeong: 36, jamsil: 32.1, yongsan: 34 });

    expect(["daechi", "gaepo"].map((k) => s.get(k)?.tier.id)).toEqual(["grandmaster", "grandmaster"]);
    expect(["apgujeong", "yongsan", "jamsil"].map((k) => s.get(k)?.tier.id)).toEqual(["master", "master", "master"]);
  });

  it("keeps a grandmaster seat empty rather than give it to a price under 35억", () => {
    const s = standings({ banpo: 53.9, jamsil: 34.9 });

    expect(s.get("jamsil")?.tier.id).toBe("master");
  });

  it("splits a tier into divisions IV–I and counts LP inside the division", () => {
    // diamond 25–30억 in 1.25억 steps: 28.2억 sits in II, 56% of the way to I
    const s = standings({ seongsu: 28.2 });

    expect(s.get("seongsu")).toMatchObject({ tier: { id: "diamond" }, division: 2, lp: 56 });
  });

  it("starts a tier at division IV with 0 LP", () => {
    expect(standings({ a: 12 }).get("a")).toMatchObject({ tier: { id: "gold" }, division: 4, lp: 0 });
  });

  it("puts anything under 3억 at Iron IV, 0 LP", () => {
    expect(standings({ a: 2 }).get("a")).toMatchObject({ tier: { id: "iron" }, division: 4, lp: 0 });
  });

  it("gives apex tiers no division and one LP per 100만원 above 30억", () => {
    const s = standings({ banpo: 53.9, jamsil: 32.13 });

    expect(s.get("banpo")).toMatchObject({ division: null, lp: 2390 });
    expect(s.get("jamsil")).toMatchObject({ division: null, lp: 213 });
  });

  it("measures the climb to the next division floor", () => {
    // Diamond II → Diamond I at 28.75억
    expect(standings({ seongsu: 28.2 }).get("seongsu")?.toNext).toBe(5500);
  });

  it("measures division I's climb to the next tier's floor", () => {
    expect(standings({ a: 29.5 }).get("a")?.toNext).toBe(5000);
  });

  it("measures master's climb to the lowest grandmaster once both seats are taken", () => {
    const s = standings({ banpo: 53.9, daechi: 38.9, gaepo: 36.8, jamsil: 32.1 });

    expect(s.get("jamsil")?.toNext).toBe(368000 - 321000);
  });

  it("measures master's climb to 35억 while a grandmaster seat is open", () => {
    expect(standings({ banpo: 53.9, jamsil: 32.1 }).get("jamsil")?.toNext).toBe(350000 - 321000);
  });

  it("measures a grandmaster's climb to the challenger's price", () => {
    const s = standings({ banpo: 53.9, daechi: 38.9 });

    expect(s.get("daechi")?.toNext).toBe(539000 - 389000);
  });

  it("measures a grandmaster's climb to 50억 while the throne is empty", () => {
    expect(standings({ banpo: 48 }).get("banpo")?.toNext).toBe(20000);
  });

  it("has nothing left to climb for the challenger", () => {
    expect(standings({ banpo: 53.9 }).get("banpo")?.toNext).toBeNull();
  });
});
