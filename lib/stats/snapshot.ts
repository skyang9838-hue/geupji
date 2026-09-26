import type { RegionDef } from "@/data/regions";
import { monthsBetween } from "@/lib/molit/plan";
import { peakBetween, type PricePoint } from "./records";
import {
  BASE_BAND,
  isQualifying,
  priceChange,
  representativePrice,
  shiftDate,
  type PriceChange,
  type RepresentativePrice,
  type SizeBand,
  type StatTrade,
} from "./representative";
import type { Division, Standing, TierLevel } from "./tiers";

export interface ComplexHistory {
  aptSeq: string;
  name: string;
  buildYear: number | null;
  umdName: string;
  trades: StatTrade[];
}

export interface Contender {
  aptSeq: string;
  name: string;
  buildYear: number | null;
  priceManwon: number;
  count: number;
  stale: boolean;
}

/** The representative price as it stood at a month's end (the as-of day for the current month). */
export interface HistoryPoint {
  ym: string;
  priceManwon: number | null;
}

/** What one region's trades say on their own, before it is ranked against the others. */
export interface RegionFacts {
  regionSlug: string;
  leader: { aptSeq: string; name: string; buildYear: number | null } | null;
  rep: RepresentativePrice | null;
  change3m: PriceChange | null;
  /** 전고점: best qualifying deal in 2021–2022, the last cycle's top. */
  peak: PricePoint | null;
  vsPeak: number | null;
  /** Best qualifying deal we hold for the leader. */
  high: PricePoint | null;
  contenders: Contender[];
  /** Month by month since January 2021. */
  history: HistoryPoint[];
}

export interface LadderPoint {
  ym: string;
  rank: number | null;
  level: TierLevel | null;
}

export interface SeasonRecord {
  year: number;
  level: TierLevel;
  division: Division | null;
  priceManwon: number;
}

/** A region ranked against the edition: today's standing, its monthly ladder and closing tier per year. */
export interface RegionSnapshot extends RegionFacts {
  standing: Standing | null;
  ladder: LadderPoint[];
  seasons: SeasonRecord[];
}

const HISTORY_FROM = "202101";
const PEAK_FROM = "2021-01-01";
const PEAK_TO = "2022-12-31";
const CONTENDERS = 5;
const AUTO_LEADER_MAX_AGE = 30;
const AUTO_LEADER_MIN_DEALS = 3;

export function buildRegionSnapshot(
  region: RegionDef,
  complexes: ComplexHistory[],
  asOf: string,
): RegionFacts {
  const band = region.band ?? BASE_BAND;

  const priced = complexes
    .map((c) => ({ complex: c, rep: representativePrice(c.trades, asOf, band) }))
    .filter((p): p is { complex: ComplexHistory; rep: RepresentativePrice } => p.rep !== null)
    .sort((a, b) => Number(a.rep.stale) - Number(b.rep.stale) || b.rep.priceManwon - a.rep.priceManwon);

  const configured = region.leaderAptSeq ? complexes.find((c) => c.aptSeq === region.leaderAptSeq) : undefined;
  const leader = configured ?? priced.find((p) => canLeadOnItsOwn(p.complex, asOf, band))?.complex ?? priced[0]?.complex ?? null;

  const empty: RegionFacts = {
    regionSlug: region.slug,
    leader: null,
    rep: null,
    change3m: null,
    peak: null,
    vsPeak: null,
    high: null,
    contenders: [],
    history: [],
  };
  if (!leader) return empty;

  const rep = representativePrice(leader.trades, asOf, band);
  const peak = peakBetween(leader.trades, PEAK_FROM, PEAK_TO, band);

  return {
    regionSlug: region.slug,
    leader: { aptSeq: leader.aptSeq, name: leader.name, buildYear: leader.buildYear },
    rep,
    change3m: priceChange(leader.trades, asOf, 90, band),
    peak,
    vsPeak: rep && peak ? rep.priceManwon / peak.priceManwon - 1 : null,
    high: peakBetween(leader.trades, "0000-01-01", asOf, band),
    contenders: priced.slice(0, CONTENDERS).map(({ complex, rep: r }) => ({
      aptSeq: complex.aptSeq,
      name: complex.name,
      buildYear: complex.buildYear,
      priceManwon: r.priceManwon,
      count: r.count,
      stale: r.stale,
    })),
    history: priceHistory(leader.trades, asOf, band),
  };
}

/**
 * Without a configured leader, the priciest complex leads only if it is a going concern:
 * younger than 30 (older ones trade on redevelopment hopes) and with three or more
 * qualifying deals in the past year (so one odd sale can't crown it).
 */
function canLeadOnItsOwn(complex: ComplexHistory, asOf: string, band: SizeBand): boolean {
  const age = complex.buildYear === null ? 0 : Number(asOf.slice(0, 4)) - complex.buildYear;
  if (age >= AUTO_LEADER_MAX_AGE) return false;
  const since = shiftDate(asOf, -365);
  const deals = complex.trades.filter((t) => isQualifying(t, band) && t.dealDate > since && t.dealDate <= asOf);
  return deals.length >= AUTO_LEADER_MIN_DEALS;
}

/** The representative price at every month end from January 2021, the as-of day closing the last month. */
function priceHistory(trades: StatTrade[], asOf: string, band = BASE_BAND): HistoryPoint[] {
  const endYm = asOf.slice(0, 4) + asOf.slice(5, 7);
  return monthsBetween(HISTORY_FROM, endYm).map((ym) => {
    const day = ym === endYm ? asOf : monthEnd(ym);
    return { ym, priceManwon: representativePrice(trades, day, band)?.priceManwon ?? null };
  });
}

function monthEnd(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4));
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
