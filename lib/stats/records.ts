import { BASE_BAND, isQualifying, type SizeBand, type StatTrade } from "./representative";

export interface PricePoint {
  priceManwon: number;
  dealDate: string;
}

/** Highest qualifying deal with `from <= dealDate <= to`. Used for 전고점 (2021–2022 peak). */
export function peakBetween(
  trades: StatTrade[],
  from: string,
  to: string,
  band: SizeBand = BASE_BAND,
): PricePoint | null {
  let best: PricePoint | null = null;
  for (const t of trades) {
    if (!isQualifying(t, band) || t.dealDate < from || t.dealDate > to) continue;
    if (!best || t.priceManwon > best.priceManwon) best = { priceManwon: t.priceManwon, dealDate: t.dealDate };
  }
  return best;
}

/** Best qualifying price up to the deal's date, not counting the deal itself (identity). */
export function previousHigh(
  deal: StatTrade,
  history: StatTrade[],
  band: SizeBand = BASE_BAND,
): number | null {
  let best: number | null = null;
  for (const t of history) {
    if (t === deal || !isQualifying(t, band) || t.dealDate > deal.dealDate) continue;
    if (best === null || t.priceManwon > best) best = t.priceManwon;
  }
  return best;
}

/** 신고가: a qualifying deal strictly above every earlier qualifying deal we hold. */
export function isNewHigh(deal: StatTrade, history: StatTrade[], band: SizeBand = BASE_BAND): boolean {
  if (!isQualifying(deal, band)) return false;
  const prev = previousHigh(deal, history, band);
  return prev !== null && deal.priceManwon > prev;
}
