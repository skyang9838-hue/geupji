import type { RawTradeItem } from "./parse";

/** A MOLIT apartment trade in the shape the app stores. Dates are ISO `YYYY-MM-DD`. */
export interface NormalizedTrade {
  aptSeq: string;
  aptName: string;
  sggCd: string;
  umdName: string;
  jibun: string | null;
  roadName: string | null;
  buildYear: number | null;
  dealDate: string;
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealingType: string | null;
  buyerType: string | null;
  sellerType: string | null;
  cancelled: boolean;
  cancelledOn: string | null;
  registeredOn: string | null;
  aptDong: string | null;
}

export function normalizeTrade(raw: RawTradeItem): NormalizedTrade {
  const priceManwon = Number.parseInt((raw.dealAmount ?? "").replace(/[,\s]/g, ""), 10);
  if (!Number.isFinite(priceManwon)) {
    throw new Error(`Unreadable dealAmount "${raw.dealAmount}" for ${raw.aptSeq}`);
  }

  const areaM2 = Number.parseFloat(raw.excluUseAr);
  if (!Number.isFinite(areaM2)) {
    throw new Error(`Unreadable excluUseAr "${raw.excluUseAr}" for ${raw.aptSeq}`);
  }

  const buildYear = Number.parseInt(raw.buildYear, 10);

  return {
    aptSeq: raw.aptSeq,
    aptName: raw.aptNm,
    sggCd: raw.sggCd,
    umdName: raw.umdNm,
    jibun: blankToNull(raw.jibun),
    roadName: blankToNull(raw.roadNm),
    buildYear: Number.isFinite(buildYear) ? buildYear : null,
    dealDate: isoDate(raw.dealYear, raw.dealMonth, raw.dealDay),
    areaM2,
    floor: Number.parseInt(raw.floor, 10) || 0,
    priceManwon,
    dealingType: blankToNull(raw.dealingGbn),
    buyerType: blankToNull(raw.buyerGbn),
    sellerType: blankToNull(raw.slerGbn),
    cancelled: (raw.cdealType ?? "").trim() !== "",
    cancelledOn: parseShortDate(raw.cdealDay ?? ""),
    registeredOn: parseShortDate(raw.rgstDate ?? ""),
    aptDong: blankToNull(raw.aptDong),
  };
}

/** MOLIT writes cancellation and registration dates as `YY.MM.DD` (sometimes `YYYY.MM.DD`). */
export function parseShortDate(value: string): string | null {
  const parts = value.trim().split(".");
  if (parts.length !== 3 || parts.some((p) => p === "")) return null;
  const [y, m, d] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  return isoDate(year, m, d);
}

function isoDate(year: string, month: string, day: string): string {
  return `${year.trim()}-${month.trim().padStart(2, "0")}-${day.trim().padStart(2, "0")}`;
}

function blankToNull(value: string | undefined): string | null {
  const v = (value ?? "").trim();
  return v === "" ? null : v;
}
