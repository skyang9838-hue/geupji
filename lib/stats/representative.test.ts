import { describe, expect, it } from "vitest";
import { priceChange, representativePrice, type StatTrade } from "./representative";

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

const AS_OF = "2026-09-26";

describe("representativePrice", () => {
  it("takes the median of live 84㎡ deals in the last 90 days", () => {
    const rep = representativePrice(
      [t("2026-09-20", 300000), t("2026-08-10", 310000), t("2026-07-01", 305000)],
      AS_OF,
    );

    expect(rep).toEqual({ priceManwon: 305000, windowDays: 90, count: 3, stale: false, lastDealDate: "2026-09-20" });
  });

  it("averages the two middle deals when the count is even, rounded to 만원", () => {
    const rep = representativePrice([t("2026-09-20", 300000), t("2026-09-01", 300001)], AS_OF);

    expect(rep?.priceManwon).toBe(300001);
  });

  it("ignores cancelled, withdrawn, direct and off-size deals", () => {
    const rep = representativePrice(
      [
        t("2026-09-20", 300000),
        t("2026-09-19", 300000),
        t("2026-09-18", 900000, { cancelled: true }),
        t("2026-09-17", 900000, { removed: true }),
        t("2026-09-16", 100000, { dealingType: "직거래" }),
        t("2026-09-15", 200000, { areaM2: 59.99 }),
      ],
      AS_OF,
    );

    expect(rep).toMatchObject({ priceManwon: 300000, count: 2 });
  });

  it("does not look at deals after the as-of date", () => {
    const rep = representativePrice(
      [t("2026-09-20", 300000), t("2026-09-21", 300000), t("2026-09-27", 999999)],
      AS_OF,
    );

    expect(rep?.priceManwon).toBe(300000);
  });

  it("widens to 180 days when 90 days hold fewer than two deals", () => {
    const rep = representativePrice([t("2026-09-20", 300000), t("2026-05-01", 280000)], AS_OF);

    expect(rep).toMatchObject({ priceManwon: 290000, windowDays: 180, count: 2 });
  });

  it("widens to 365 days and accepts a single deal there", () => {
    const rep = representativePrice([t("2026-01-10", 270000)], AS_OF);

    expect(rep).toMatchObject({ priceManwon: 270000, windowDays: 365, count: 1, stale: false });
  });

  it("falls back to the last deal, flagged stale, when a whole year is silent", () => {
    const rep = representativePrice([t("2024-03-02", 250000), t("2023-01-01", 200000)], AS_OF);

    expect(rep).toEqual({ priceManwon: 250000, windowDays: null, count: 0, stale: true, lastDealDate: "2024-03-02" });
  });

  it("returns null when there has never been a qualifying deal", () => {
    expect(representativePrice([t("2026-09-20", 300000, { cancelled: true })], AS_OF)).toBeNull();
  });

  it("uses a custom size band for a complex without 84㎡ units", () => {
    const rep = representativePrice(
      [t("2026-09-20", 200000, { areaM2: 59.99 }), t("2026-09-10", 210000, { areaM2: 59.97 })],
      AS_OF,
      { minM2: 58, maxM2: 61 },
    );

    expect(rep?.priceManwon).toBe(205000);
  });
});

describe("priceChange", () => {
  it("compares today's representative price with the one 90 days earlier", () => {
    const trades = [
      t("2026-09-20", 310000),
      t("2026-09-01", 310000),
      t("2026-06-10", 290000),
      t("2026-05-20", 290000),
    ];

    expect(priceChange(trades, AS_OF, 90)).toEqual({ from: 290000, to: 310000, diff: 20000, ratio: 20000 / 290000 });
  });

  it("returns null when either end has no price", () => {
    expect(priceChange([t("2026-09-20", 310000)], AS_OF, 90)).toBeNull();
  });
});
