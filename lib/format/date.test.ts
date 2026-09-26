import { describe, expect, it } from "vitest";
import { formatKoreanDate, formatEditionDate } from "./date";

describe("formatKoreanDate", () => {
  it("writes month and day without leading zeros", () => {
    expect(formatKoreanDate("2026-09-05")).toBe("9월 5일");
  });
});

describe("formatEditionDate", () => {
  it("writes the full dateline with the weekday", () => {
    expect(formatEditionDate("2026-09-26")).toBe("2026년 9월 26일 토요일");
  });
});
