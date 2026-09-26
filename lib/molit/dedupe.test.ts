import { describe, expect, it } from "vitest";
import { keyTrades } from "./dedupe";
import type { NormalizedTrade } from "./normalize";

const trade = (over: Partial<NormalizedTrade> = {}): NormalizedTrade => ({
  aptSeq: "11110-2212",
  aptName: "인왕산아이파크",
  sggCd: "11110",
  umdName: "무악동",
  jibun: "60",
  roadName: null,
  buildYear: 2008,
  dealDate: "2025-01-18",
  areaM2: 84.858,
  floor: 1,
  priceManwon: 115000,
  dealingType: "중개거래",
  buyerType: "개인",
  sellerType: "개인",
  cancelled: false,
  cancelledOn: null,
  registeredOn: null,
  aptDong: null,
  ...over,
});

describe("keyTrades", () => {
  it("numbers identical trades in the same month 0, 1, ...", () => {
    const keyed = keyTrades([trade(), trade()]);

    expect(keyed[0].sourceKey).toBe(keyed[1].sourceKey);
    expect(keyed.map((t) => t.occurrence).sort()).toEqual([0, 1]);
  });

  it("gives a different key when a stable field differs", () => {
    const [a, b] = keyTrades([trade(), trade({ priceManwon: 116000 })]);

    expect(a.sourceKey).not.toBe(b.sourceKey);
    expect(a.occurrence).toBe(0);
    expect(b.occurrence).toBe(0);
  });

  it("keeps the key when only later-filled fields change", () => {
    const [before] = keyTrades([trade()]);
    const [after] = keyTrades([
      trade({ cancelled: true, cancelledOn: "2025-02-03", registeredOn: "2025-03-14", aptDong: "103" }),
    ]);

    expect(after.sourceKey).toBe(before.sourceKey);
    expect(after.occurrence).toBe(0);
  });

  it("ignores the lookup district code so a re-coded district does not duplicate trades", () => {
    const [old] = keyTrades([trade({ sggCd: "41590" })]);
    const [renamed] = keyTrades([trade({ sggCd: "41597" })]);

    expect(renamed.sourceKey).toBe(old.sourceKey);
  });

  it("assigns occurrences the same way whatever order the API returns", () => {
    const registered = trade({ registeredOn: "2025-03-14", aptDong: "103" });
    const plain = trade();

    const first = keyTrades([registered, plain]);
    const second = keyTrades([plain, registered]);

    const occurrenceOf = (list: ReturnType<typeof keyTrades>, dong: string | null) =>
      list.find((t) => t.aptDong === dong)!.occurrence;
    expect(occurrenceOf(first, "103")).toBe(occurrenceOf(second, "103"));
    expect(occurrenceOf(first, null)).toBe(occurrenceOf(second, null));
  });
});
