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
  /** The complex that led the region that month, when it was not today's leader. */
  leaderName?: string;
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
  /** Month by month since January 2006, each month priced by the leader of that month. */
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

const HISTORY_FROM = "200601";
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
    history: leaderHistory(complexes, configured ?? null, leader, asOf, band),
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

/** A challenger must top the sitting leader by this much … */
export const LEADER_SWITCH_MARGIN = 0.05;
/** … for this many month ends in a row before it takes over. */
export const LEADER_SWITCH_MONTHS = 3;

/**
 * The region's price at every month end from January 2006, the as-of day closing
 * the last month. Each month is priced by whoever led then: the configured
 * leader once it trades, otherwise the same auto rule as today, judged at that
 * month (younger than 30 then, three deals in the year before). Long-run 급지
 * stays "the region's top complex", not one building's price before it existed.
 *
 * The auto leader is sticky (사용자 2026-11-09: "너무 많이 바뀌어도 안 된다"):
 * it keeps the seat while it still traded in the past year and is under 30, even
 * in a thin month (its last representative price carries, so the line doesn't dip
 * to a cheaper complex for a month). A challenger takes over only after leading
 * by LEADER_SWITCH_MARGIN for LEADER_SWITCH_MONTHS month ends in a row. With no
 * sitting leader the priciest eligible complex takes the seat at once.
 */
function leaderHistory(
  complexes: ComplexHistory[],
  configured: ComplexHistory | null,
  today: ComplexHistory,
  asOf: string,
  band = BASE_BAND,
): HistoryPoint[] {
  const endYm = asOf.slice(0, 4) + asOf.slice(5, 7);
  const qualifying = complexes
    .map((c) => ({ c, trades: c.trades.filter((t) => isQualifying(t, band)) }))
    .filter((q) => q.trades.length > 0);
  let seat: ComplexHistory | null = null;
  let challenger: ComplexHistory | null = null;
  let streak = 0;
  return monthsBetween(HISTORY_FROM, endYm).map((ym) => {
    const day = ym === endYm ? asOf : monthEnd(ym);
    const since = shiftDate(day, -365);
    const recent = qualifying.filter((q) => q.trades.some((t) => t.dealDate > since && t.dealDate <= day));
    const priced = recent
      .map((q) => ({ c: q.c, rep: representativePrice(q.trades, day, band) }))
      .filter((p): p is { c: ComplexHistory; rep: RepresentativePrice } => p.rep !== null);
    const live = priced.filter((p) => !p.rep.stale).sort((a, b) => b.rep.priceManwon - a.rep.priceManwon);

    let lead = live.find((p) => p.c === configured);
    if (lead) {
      seat = lead.c;
      challenger = null;
      streak = 0;
    } else {
      const best = live.find((p) => canLeadOnItsOwn(p.c, day, band)) ?? live[0];
      const held = seat && canHold(seat, day) ? priced.find((p) => p.c === seat) : undefined;
      if (!held) {
        lead = best;
        seat = best?.c ?? null;
        challenger = null;
        streak = 0;
      } else if (best && best.c !== held.c && best.rep.priceManwon > held.rep.priceManwon * (1 + LEADER_SWITCH_MARGIN)) {
        streak = challenger === best.c ? streak + 1 : 1;
        challenger = best.c;
        if (streak >= LEADER_SWITCH_MONTHS) {
          lead = best;
          seat = best.c;
          challenger = null;
          streak = 0;
        } else lead = held;
      } else {
        lead = held;
        challenger = null;
        streak = 0;
      }
    }
    if (!lead) return { ym, priceManwon: null };
    return lead.c === today
      ? { ym, priceManwon: lead.rep.priceManwon }
      : { ym, priceManwon: lead.rep.priceManwon, leaderName: lead.c.name };
  });
}

/** A sitting auto leader keeps its seat while it is under 30 at that month. Recent trading is checked by the caller. */
function canHold(complex: ComplexHistory, day: string): boolean {
  const age = complex.buildYear === null ? 0 : Number(day.slice(0, 4)) - complex.buildYear;
  return age < AUTO_LEADER_MAX_AGE;
}

function monthEnd(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4));
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
