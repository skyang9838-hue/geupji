/** The slice of a trade the price statistics need. Dates are ISO `YYYY-MM-DD`. */
export interface StatTrade {
  dealDate: string;
  priceManwon: number;
  areaM2: number;
  floor: number;
  dealingType: string | null;
  cancelled: boolean;
  removed: boolean;
}

/** Exclusive-area band that counts as "the" size of a complex. Min inclusive, max exclusive. */
export interface SizeBand {
  minM2: number;
  maxM2: number;
}

/** 국평: 전용 84㎡형 (84.9x, 84.8x … and the odd 83.x / 85.x). */
export const BASE_BAND: SizeBand = { minM2: 83, maxM2: 86 };

export interface RepresentativePrice {
  priceManwon: number;
  /** Window the median came from; null when the price is a stale carry-over. */
  windowDays: 90 | 180 | 365 | null;
  count: number;
  stale: boolean;
  lastDealDate: string;
}

const WINDOWS: ReadonlyArray<{ days: 90 | 180 | 365; minCount: number }> = [
  { days: 90, minCount: 2 },
  { days: 180, minCount: 2 },
  { days: 365, minCount: 1 },
];

/** A deal counts toward prices only if it stood, was brokered, and is the reference size. */
export function isQualifying(t: StatTrade, band: SizeBand = BASE_BAND): boolean {
  return (
    !t.cancelled &&
    !t.removed &&
    t.dealingType !== "직거래" &&
    t.areaM2 >= band.minM2 &&
    t.areaM2 < band.maxM2
  );
}

/**
 * Median of qualifying deals in the last 90 days; widens to 180 and then 365
 * days when trading is thin. A year of silence carries the last price forward
 * as `stale` rather than dropping the complex off the board.
 */
export function representativePrice(
  trades: StatTrade[],
  asOf: string,
  band: SizeBand = BASE_BAND,
): RepresentativePrice | null {
  const end = dayNumber(asOf);
  const eligible = trades
    .filter((t) => isQualifying(t, band) && dayNumber(t.dealDate) <= end)
    .sort((a, b) => b.dealDate.localeCompare(a.dealDate));
  if (eligible.length === 0) return null;

  const lastDealDate = eligible[0].dealDate;

  for (const { days, minCount } of WINDOWS) {
    const inWindow = eligible.filter((t) => dayNumber(t.dealDate) > end - days);
    if (inWindow.length >= minCount) {
      return {
        priceManwon: median(inWindow.map((t) => t.priceManwon)),
        windowDays: days,
        count: inWindow.length,
        stale: false,
        lastDealDate,
      };
    }
  }

  return { priceManwon: eligible[0].priceManwon, windowDays: null, count: 0, stale: true, lastDealDate };
}

export interface PriceChange {
  from: number;
  to: number;
  diff: number;
  ratio: number;
}

/** Representative price now versus `days` earlier. Null when either end has no fresh price. */
export function priceChange(
  trades: StatTrade[],
  asOf: string,
  days: number,
  band: SizeBand = BASE_BAND,
): PriceChange | null {
  const now = representativePrice(trades, asOf, band);
  const then = representativePrice(trades, shiftDate(asOf, -days), band);
  if (!now || !then || now.stale || then.stale) return null;
  const diff = now.priceManwon - then.priceManwon;
  return { from: then.priceManwon, to: now.priceManwon, diff, ratio: diff / then.priceManwon };
}

export function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function shiftDate(iso: string, days: number): string {
  return new Date((dayNumber(iso) + days) * 86_400_000).toISOString().slice(0, 10);
}
