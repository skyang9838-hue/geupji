import { describe, expect, it } from "vitest";
import { priceAtGeupji, rankStandings } from "@/lib/stats/tiers";
import { formatClimb, formatGeupji, formatLp, formatTier, romanDivision } from "./tier";

const ANCHOR = 500000; // 50억

/** A region at a given 급지 against a lone 50억 anchor, with optional others in 억. */
const standing = (g: number, others: Record<string, number> = {}) =>
  rankStandings([
    { key: "anchor", priceManwon: ANCHOR, anchor: true },
    { key: "me", priceManwon: Math.round(priceAtGeupji(g, ANCHOR)) },
    ...Object.entries(others).map(([key, e]) => ({ key, priceManwon: Math.round(e * 10000) })),
  ]).get("me")!;
const top = () => rankStandings([{ key: "a", priceManwon: ANCHOR }]).get("a")!;

describe("romanDivision", () => {
  it("writes divisions the way the ladder does, IV at the bottom", () => {
    expect([4, 3, 2, 1].map((d) => romanDivision(d as 1 | 2 | 3 | 4))).toEqual(["IV", "III", "II", "I"]);
  });
});

describe("formatTier", () => {
  it("names a divided tier with its division", () => {
    expect(formatTier(standing(1.8655))).toBe("다이아몬드 II");
  });

  it("names an apex tier alone", () => {
    expect(formatTier(top())).toBe("챌린저");
  });
});

describe("formatGeupji", () => {
  it("writes 급지 to one decimal, rounded up so it never reads as the better tier", () => {
    expect(formatGeupji(standing(2.24))).toBe("2.3급지");
    expect(formatGeupji(standing(2.12))).toBe("2.2급지");
    expect(formatGeupji(top())).toBe("1.0급지");
  });
});

describe("formatLp", () => {
  it("groups thousands", () => {
    expect(formatLp(top())).toBe("1,610 LP");
    expect(formatLp(standing(1.8655))).toBe("34 LP");
  });
});

describe("formatClimb", () => {
  it("says how far the next division is", () => {
    expect(formatClimb(standing(1.8655))).toBe("다이아몬드 I까지 1억 1,457만");
  });

  it("names the next tier from division I", () => {
    expect(formatClimb(standing(1.75))).toBe("마스터까지 9,285만");
  });

  it("names the seat above for grandmaster", () => {
    expect(formatClimb(standing(1.2))).toBe(`챌린저까지 ${amountOf(ANCHOR - Math.round(priceAtGeupji(1.2, ANCHOR)))}`);
  });

  it("says nothing for the challenger", () => {
    expect(formatClimb(top())).toBeNull();
  });
});

function amountOf(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const man = manwon % 10000;
  return eok === 0 ? `${man.toLocaleString("ko-KR")}만` : `${eok}억 ${man.toLocaleString("ko-KR")}만`;
}
