import { describe, expect, it } from "vitest";
import { formatChange, formatEok, formatKoreanPrice, formatPercent } from "./price";

describe("formatEok", () => {
  it("shows 만원 as 억 with one decimal, dropping a trailing .0", () => {
    expect(formatEok(305000)).toBe("30.5억");
    expect(formatEok(300000)).toBe("30억");
  });

  it("keeps a fixed number of decimals for table columns", () => {
    expect(formatEok(234500, { decimals: 2, fixed: true })).toBe("23.45억");
    expect(formatEok(300000, { decimals: 2, fixed: true })).toBe("30.00억");
  });
});

describe("formatKoreanPrice", () => {
  it("writes 억 and 만 the way a Korean article does", () => {
    expect(formatKoreanPrice(234500)).toBe("23억 4,500만 원");
  });

  it("omits an empty 만 part", () => {
    expect(formatKoreanPrice(300000)).toBe("30억 원");
  });

  it("handles prices under 1억", () => {
    expect(formatKoreanPrice(4500)).toBe("4,500만 원");
  });
});

describe("formatChange", () => {
  it("marks a rise with ▲ and a short amount", () => {
    expect(formatChange(12000)).toEqual({ direction: "up", arrow: "▲", text: "1.2억" });
  });

  it("marks a fall with ▼ and shows sub-억 amounts in 만", () => {
    expect(formatChange(-4500)).toEqual({ direction: "down", arrow: "▼", text: "4,500만" });
  });

  it("shows no change as a flat dash", () => {
    expect(formatChange(0)).toEqual({ direction: "flat", arrow: "–", text: "0" });
  });
});

describe("formatPercent", () => {
  it("formats a ratio with a sign and one decimal", () => {
    expect(formatPercent(0.069)).toBe("+6.9%");
    expect(formatPercent(-0.1234)).toBe("−12.3%");
  });

  it("can drop the sign for plain shares", () => {
    expect(formatPercent(0.952, { signed: false })).toBe("95.2%");
  });
});
