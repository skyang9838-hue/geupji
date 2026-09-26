import { describe, expect, it } from "vitest";
import { normalizeTrade, parseShortDate } from "./normalize";
import type { RawTradeItem } from "./parse";

const raw = (over: Partial<RawTradeItem> = {}): RawTradeItem => ({
  aptDong: "",
  aptNm: "인왕산아이파크",
  aptSeq: "11110-2212",
  buildYear: "2008",
  buyerGbn: "개인",
  cdealDay: "",
  cdealType: "",
  dealAmount: "115,000",
  dealDay: "18",
  dealMonth: "1",
  dealYear: "2025",
  dealingGbn: "중개거래",
  excluUseAr: "84.858",
  floor: "1",
  jibun: "60",
  rgstDate: "",
  roadNm: "통일로18길",
  sggCd: "11110",
  slerGbn: "개인",
  umdNm: "무악동",
  ...over,
});

describe("normalizeTrade", () => {
  it("turns the comma price in 만원 into an integer", () => {
    expect(normalizeTrade(raw({ dealAmount: " 98,500" })).priceManwon).toBe(98500);
  });

  it("builds an ISO contract date with zero padding", () => {
    expect(normalizeTrade(raw()).dealDate).toBe("2025-01-18");
  });

  it("keeps the exclusive area as a number", () => {
    expect(normalizeTrade(raw()).areaM2).toBe(84.858);
  });

  it("carries complex identity and location", () => {
    const t = normalizeTrade(raw());
    expect(t).toMatchObject({
      aptSeq: "11110-2212",
      aptName: "인왕산아이파크",
      sggCd: "11110",
      umdName: "무악동",
      jibun: "60",
      roadName: "통일로18길",
      buildYear: 2008,
      floor: 1,
    });
  });

  it("marks a cancelled deal and parses its cancellation date", () => {
    const t = normalizeTrade(raw({ cdealType: "O", cdealDay: "25.02.03" }));
    expect(t.cancelled).toBe(true);
    expect(t.cancelledOn).toBe("2025-02-03");
  });

  it("treats a blank cancellation type as a live deal", () => {
    const t = normalizeTrade(raw());
    expect(t.cancelled).toBe(false);
    expect(t.cancelledOn).toBeNull();
  });

  it("parses the registration date and the building number when present", () => {
    const t = normalizeTrade(raw({ rgstDate: "25.03.14", aptDong: "103" }));
    expect(t.registeredOn).toBe("2025-03-14");
    expect(t.aptDong).toBe("103");
  });

  it("turns blank optional text into null", () => {
    const t = normalizeTrade(raw());
    expect(t.aptDong).toBeNull();
    expect(t.registeredOn).toBeNull();
  });

  it("keeps the dealing type so direct deals can be told apart", () => {
    expect(normalizeTrade(raw({ dealingGbn: "직거래" })).dealingType).toBe("직거래");
  });

  it("rejects an item whose price cannot be read", () => {
    expect(() => normalizeTrade(raw({ dealAmount: "" }))).toThrow(/dealAmount/);
  });
});

describe("parseShortDate", () => {
  it("reads YY.MM.DD as 20YY", () => {
    expect(parseShortDate("25.02.03")).toBe("2025-02-03");
  });

  it("reads a four-digit year as written", () => {
    expect(parseShortDate("2025.02.03")).toBe("2025-02-03");
  });

  it("returns null for blank input", () => {
    expect(parseShortDate("")).toBeNull();
  });
});
