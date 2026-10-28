export type TierId =
  | "challenger"
  | "grandmaster"
  | "master"
  | "diamond"
  | "emerald"
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "iron";

/** 0 is the top of the ladder (challenger), 9 the bottom (iron). */
export type TierLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 4 is division IV (the bottom of a tier), 1 is division I. */
export type Division = 1 | 2 | 3 | 4;

export interface Tier {
  level: TierLevel;
  id: TierId;
  name: string;
  /**
   * Worst 급지 that still qualifies, inclusive. The apex tiers share master's
   * bound: inside it, challenger and grandmaster go to the top places.
   */
  maxGeupji: number;
  /** Apex seats held by rank, as League limits challenger and grandmaster. */
  seats?: number;
}

/**
 * The ladder, top down, after League of Legends ranked. Tiers are relative:
 * each price becomes a 급지 against the Seoul anchor (see `geupji`), and the
 * bounds below are in 급지. Change them only here.
 */
export const TIERS: readonly Tier[] = [
  { level: 0, id: "challenger", name: "챌린저", maxGeupji: 1.7, seats: 1 },
  { level: 1, id: "grandmaster", name: "그랜드마스터", maxGeupji: 1.7, seats: 2 },
  { level: 2, id: "master", name: "마스터", maxGeupji: 1.7 },
  { level: 3, id: "diamond", name: "다이아몬드", maxGeupji: 2.1 },
  { level: 4, id: "emerald", name: "에메랄드", maxGeupji: 2.4 },
  { level: 5, id: "platinum", name: "플래티넘", maxGeupji: 2.8 },
  { level: 6, id: "gold", name: "골드", maxGeupji: 3.2 },
  { level: 7, id: "silver", name: "실버", maxGeupji: 3.6 },
  { level: 8, id: "bronze", name: "브론즈", maxGeupji: 4.0 },
  { level: 9, id: "iron", name: "아이언", maxGeupji: Infinity },
];

const [CHALLENGER, GRANDMASTER, MASTER] = TIERS;

/**
 * 급지 = 1 + K × ln(anchor ÷ price), never better than 1.0. With K = 1.8 the
 * community 급지표 (압구정 1.0 … 송도 4.0) comes back within a few tenths.
 */
export const GEUPJI_K = 1.8;
/** The anchor is the mean of this many top Seoul prices. */
export const ANCHOR_COUNT = 3;
/** Iron's divisions count down to here; anything worse is Iron IV at 0 LP. */
const IRON_WORST = 4.4;
/** At master and up there are no divisions: one LP per 100만원 over master's floor. */
const APEX_LP_STEP = 100;

export interface Standing {
  /** 1-based place among every priced entry. */
  rank: number;
  tier: Tier;
  /** null for the apex tiers (master and up), which have no divisions. */
  division: Division | null;
  /** League points: 0–99 inside a division; at master and up, one per 100만원 over master's floor. */
  lp: number;
  /** 만원 still to climb for the next division, tier or seat; null for the challenger. */
  toNext: number | null;
  /** 1.0 at the top; higher is further down. Shown rounded up, so the shown number never crosses into the better tier. */
  geupji: number;
  /** The Seoul anchor this ladder was measured against, in 만원. */
  anchorManwon: number;
}

export function geupji(priceManwon: number, anchorManwon: number): number {
  return Math.max(1, 1 + GEUPJI_K * Math.log(anchorManwon / priceManwon));
}

/** The price that sits exactly at a 급지, in 만원. */
export function priceAtGeupji(g: number, anchorManwon: number): number {
  return anchorManwon * Math.exp(-(g - 1) / GEUPJI_K);
}

/** Mean of the top `ANCHOR_COUNT` priced anchors; every entry counts when no anchor has a price. */
export function anchorPrice(entries: Array<{ priceManwon: number | null; anchor?: boolean }>): number | null {
  const prices = (list: typeof entries) =>
    list.map((e) => e.priceManwon).filter((p): p is number => p !== null && p > 0);
  const anchored = prices(entries.filter((e) => e.anchor));
  const top = (anchored.length > 0 ? anchored : prices(entries))
    .sort((a, b) => b - a)
    .slice(0, ANCHOR_COUNT);
  return top.length === 0 ? null : top.reduce((a, b) => a + b, 0) / top.length;
}

/** The tier a 급지 earns on its own. Apex seats are handed out by `rankStandings`. */
export function bandTier(g: number): Tier {
  return TIERS.slice(2).find((t) => g <= t.maxGeupji)!;
}

/**
 * A tier's price range against an anchor, for chart bands, in whole 만원 so the
 * server and browser draw the same SVG. Apex tiers have none: they share master's.
 */
export function tierPriceRange(tier: Tier, anchorManwon: number): { lo: number; hi: number } | null {
  if (tier.level < MASTER.level) return null;
  const hi = tier === MASTER ? Infinity : Math.round(priceAtGeupji(TIERS[tier.level - 1].maxGeupji, anchorManwon));
  return { lo: tier.id === "iron" ? 0 : Math.round(priceAtGeupji(tier.maxGeupji, anchorManwon)), hi };
}

function place(tier: Tier, g: number, anchorManwon: number): { division: Division; lp: number; nextFloor: number } {
  const best = TIERS[tier.level - 1].maxGeupji;
  const worst = tier.id === "iron" ? IRON_WORST : tier.maxGeupji;
  const width = (worst - best) / 4;
  const steps = Math.max(0, Math.min(3, Math.floor((worst - g) / width)));
  const floor = worst - steps * width;
  const lp = g > worst ? 0 : Math.min(99, Math.floor(((floor - g) / width) * 100));
  return { division: (4 - steps) as Division, lp, nextFloor: priceAtGeupji(floor - width, anchorManwon) };
}

/**
 * Rank every priced entry and give it a 급지, tier, division and LP. 급지 is
 * measured against the mean of the top Seoul (anchor) prices. Inside master's
 * bound, first place takes the one challenger seat and the next two the
 * grandmaster seats; everyone else earns the tier of their 급지.
 */
export function rankStandings(
  entries: Array<{ key: string; priceManwon: number | null; anchor?: boolean }>,
): Map<string, Standing> {
  const out = new Map<string, Standing>();
  const anchorManwon = anchorPrice(entries);
  if (anchorManwon === null) return out;
  const priced = entries
    .filter((e): e is { key: string; priceManwon: number; anchor?: boolean } => e.priceManwon !== null && e.priceManwon > 0)
    .sort((a, b) => b.priceManwon - a.priceManwon || a.key.localeCompare(b.key));

  const grades = priced.map((e) => geupji(e.priceManwon, anchorManwon));
  let challengers = CHALLENGER.seats!;
  let grandmasters = GRANDMASTER.seats!;
  const seated = grades.map((g): Tier => {
    if (g > MASTER.maxGeupji) return bandTier(g);
    if (challengers > 0) return challengers--, CHALLENGER;
    if (grandmasters > 0) return grandmasters--, GRANDMASTER;
    return MASTER;
  });

  const holders = (tier: Tier) => priced.filter((_, i) => seated[i] === tier).map((e) => e.priceManwon);
  const throne = holders(CHALLENGER)[0];
  const lowestGm = holders(GRANDMASTER).at(-1);
  const masterFloor = priceAtGeupji(MASTER.maxGeupji, anchorManwon);

  priced.forEach((e, i) => {
    const tier = seated[i];
    const price = e.priceManwon;
    const base = { rank: i + 1, tier, geupji: grades[i], anchorManwon };
    if (tier.level <= MASTER.level) {
      const target = tier === CHALLENGER ? undefined : tier === GRANDMASTER ? throne : (lowestGm ?? throne);
      const lp = Math.max(0, Math.floor((price - masterFloor) / APEX_LP_STEP));
      out.set(e.key, { ...base, division: null, lp, toNext: target === undefined ? null : Math.ceil(target - price) });
    } else {
      const { division, lp, nextFloor } = place(tier, grades[i], anchorManwon);
      out.set(e.key, { ...base, division, lp, toNext: Math.ceil(nextFloor - price) });
    }
  });
  return out;
}
