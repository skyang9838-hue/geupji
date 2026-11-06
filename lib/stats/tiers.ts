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
  /**
   * Apex seats held by rank, as League limits challenger and grandmaster.
   * Challenger has one seat only when no region is flagged challenger; with
   * them, every flagged region is challenger (see `rankStandings`).
   */
  seats?: number;
}

/**
 * The ladder, top down, after League of Legends ranked. Tiers are relative:
 * each price becomes a 급지 against the Seoul anchor (see `geupji`), and the
 * bounds below are in 급지. Change them only here.
 *
 * 2026-11-06: hand-picked regions (반포·대치·개포·성수) took challenger as a block, so every bound below moved
 * down one tier (master 1.7 → 2.1, …, bronze 4.0 → 4.4).
 */
export const TIERS: readonly Tier[] = [
  { level: 0, id: "challenger", name: "챌린저", maxGeupji: 2.1, seats: 1 },
  { level: 1, id: "grandmaster", name: "그랜드마스터", maxGeupji: 2.1, seats: 2 },
  { level: 2, id: "master", name: "마스터", maxGeupji: 2.1 },
  { level: 3, id: "diamond", name: "다이아몬드", maxGeupji: 2.4 },
  { level: 4, id: "emerald", name: "에메랄드", maxGeupji: 2.8 },
  { level: 5, id: "platinum", name: "플래티넘", maxGeupji: 3.2 },
  { level: 6, id: "gold", name: "골드", maxGeupji: 3.6 },
  { level: 7, id: "silver", name: "실버", maxGeupji: 4.0 },
  { level: 8, id: "bronze", name: "브론즈", maxGeupji: 4.4 },
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
const IRON_WORST = 4.8;
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

interface Entry {
  key: string;
  priceManwon: number | null;
  /** A Seoul region that sets 급지 1.0. */
  anchor?: boolean;
  /** A hand-picked challenger region: challenger whatever its price. */
  challenger?: boolean;
}

/**
 * Rank every priced entry and give it a 급지, tier, division and LP. 급지 is
 * measured against the mean of the top Seoul (anchor) prices.
 *
 * Every challenger-flagged entry is challenger. The next two by
 * price inside master's bound take the grandmaster seats; everyone else earns
 * the tier of their 급지. With no entry flagged, first place inside master's
 * bound takes the one challenger seat instead. Ranks run by tier, then price.
 */
export function rankStandings(entries: Entry[]): Map<string, Standing> {
  const out = new Map<string, Standing>();
  const anchorManwon = anchorPrice(entries);
  if (anchorManwon === null) return out;
  const byPrice = entries
    .filter((e): e is Entry & { priceManwon: number } => e.priceManwon !== null && e.priceManwon > 0)
    .sort((a, b) => b.priceManwon - a.priceManwon || a.key.localeCompare(b.key));

  const flagged = entries.some((e) => e.challenger);
  let challengers = flagged ? 0 : CHALLENGER.seats!;
  let grandmasters = GRANDMASTER.seats!;
  const seated = byPrice.map((e) => {
    const g = geupji(e.priceManwon, anchorManwon);
    const tier = ((): Tier => {
      if (e.challenger) return CHALLENGER;
      if (g > MASTER.maxGeupji) return bandTier(g);
      if (challengers > 0) return challengers--, CHALLENGER;
      if (grandmasters > 0) return grandmasters--, GRANDMASTER;
      return MASTER;
    })();
    return { ...e, g, tier };
  });
  const ranked = [...seated].sort((a, b) => a.tier.level - b.tier.level); // stable: price order within a tier

  const holders = (tier: Tier) => ranked.filter((e) => e.tier === tier).map((e) => e.priceManwon);
  const gms = holders(GRANDMASTER);
  const throne = flagged ? undefined : holders(CHALLENGER)[0];
  const masterFloor = priceAtGeupji(MASTER.maxGeupji, anchorManwon);

  ranked.forEach((e, i) => {
    const { tier, g, priceManwon: price } = e;
    const base = { rank: i + 1, tier, geupji: g, anchorManwon };
    if (tier.level <= MASTER.level) {
      // With challengers picked by hand, no price earns challenger: a grandmaster climbs to the grandmaster above.
      const gmAbove = flagged ? gms.filter((p) => p > price).at(-1) : throne;
      const target = tier === CHALLENGER ? undefined : tier === GRANDMASTER ? gmAbove : (gms.at(-1) ?? throne);
      const lp = Math.max(0, Math.floor((price - masterFloor) / APEX_LP_STEP));
      out.set(e.key, { ...base, division: null, lp, toNext: target === undefined ? null : Math.ceil(target - price) });
    } else {
      const { division, lp, nextFloor } = place(tier, g, anchorManwon);
      out.set(e.key, { ...base, division, lp, toNext: Math.ceil(nextFloor - price) });
    }
  });
  return out;
}
