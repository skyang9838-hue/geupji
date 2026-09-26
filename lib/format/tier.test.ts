import { describe, expect, it } from "vitest";
import { rankStandings } from "@/lib/stats/tiers";
import { formatClimb, formatLp, formatTier, romanDivision } from "./tier";

const standing = (eok: number, others: Record<string, number> = {}) =>
  rankStandings([
    { key: "me", priceManwon: Math.round(eok * 10000) },
    ...Object.entries(others).map(([key, e]) => ({ key, priceManwon: Math.round(e * 10000) })),
  ]).get("me")!;

describe("romanDivision", () => {
  it("writes divisions the way the ladder does, IV at the bottom", () => {
    expect([4, 3, 2, 1].map((d) => romanDivision(d as 1 | 2 | 3 | 4))).toEqual(["IV", "III", "II", "I"]);
  });
});

describe("formatTier", () => {
  it("names a divided tier with its division", () => {
    expect(formatTier(standing(28.2))).toBe("다이아몬드 II");
  });

  it("names an apex tier alone", () => {
    expect(formatTier(standing(53.9))).toBe("챌린저");
  });
});

describe("formatLp", () => {
  it("groups thousands", () => {
    expect(formatLp(standing(53.9))).toBe("2,390 LP");
    expect(formatLp(standing(28.2))).toBe("56 LP");
  });
});

describe("formatClimb", () => {
  it("says how far the next division is", () => {
    expect(formatClimb(standing(28.2))).toBe("다이아몬드 I까지 5,500만");
  });

  it("names the next tier from division I", () => {
    expect(formatClimb(standing(29.5))).toBe("마스터까지 5,000만");
  });

  it("writes whole 억 amounts in 억", () => {
    expect(formatClimb(standing(32.1))).toBe("그랜드마스터까지 2억 9,000만");
  });

  it("names the seat above for grandmaster", () => {
    expect(formatClimb(standing(38.9, { top: 53.9 }))).toBe("챌린저까지 15억");
  });

  it("says nothing for the challenger", () => {
    expect(formatClimb(standing(53.9))).toBeNull();
  });
});
