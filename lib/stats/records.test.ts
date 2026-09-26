import { describe, expect, it } from "vitest";
import { isNewHigh, peakBetween, previousHigh } from "./records";
import type { StatTrade } from "./representative";

const t = (dealDate: string, priceManwon: number, over: Partial<StatTrade> = {}): StatTrade => ({
  dealDate,
  priceManwon,
  areaM2: 84.97,
  floor: 10,
  dealingType: "중개거래",
  cancelled: false,
  removed: false,
  ...over,
});

describe("peakBetween", () => {
  it("finds the highest qualifying deal inside the range", () => {
    const peak = peakBetween(
      [t("2021-10-02", 270000), t("2022-03-01", 265000), t("2023-05-05", 290000), t("2021-11-11", 999999, { cancelled: true })],
      "2021-01-01",
      "2022-12-31",
    );

    expect(peak).toEqual({ priceManwon: 270000, dealDate: "2021-10-02" });
  });

  it("returns null when the range is empty", () => {
    expect(peakBetween([t("2023-05-05", 290000)], "2021-01-01", "2022-12-31")).toBeNull();
  });
});

describe("previousHigh", () => {
  it("is the best qualifying price on or before the date, excluding the deal itself", () => {
    const deal = t("2026-09-20", 320000);
    const history = [t("2025-01-01", 300000), deal, t("2026-09-21", 999999)];

    expect(previousHigh(deal, history)).toBe(300000);
  });
});

describe("isNewHigh", () => {
  it("flags a qualifying deal that beats every earlier qualifying deal", () => {
    const deal = t("2026-09-20", 320000);

    expect(isNewHigh(deal, [t("2025-01-01", 300000), t("2021-10-01", 310000), deal])).toBe(true);
  });

  it("does not flag a deal that only ties the record", () => {
    const deal = t("2026-09-20", 310000);

    expect(isNewHigh(deal, [t("2021-10-01", 310000), deal])).toBe(false);
  });

  it("does not flag the first deal on record, which has nothing to beat", () => {
    const deal = t("2026-09-20", 310000);

    expect(isNewHigh(deal, [deal])).toBe(false);
  });

  it("never flags a direct or off-size deal", () => {
    const direct = t("2026-09-20", 400000, { dealingType: "직거래" });

    expect(isNewHigh(direct, [t("2025-01-01", 300000), direct])).toBe(false);
  });

  it("ignores a cancelled earlier record when judging a new deal", () => {
    const deal = t("2026-09-20", 320000);

    expect(isNewHigh(deal, [t("2025-01-01", 300000), t("2026-01-01", 350000, { cancelled: true }), deal])).toBe(true);
  });
});
