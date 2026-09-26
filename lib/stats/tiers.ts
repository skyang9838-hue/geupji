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
  /** Lowest representative 84㎡ price that qualifies, in 만원, inclusive. */
  minManwon: number;
  /** Apex seats held by rank, as League limits challenger and grandmaster. */
  seats?: number;
}

const EOK = 10000;

/**
 * The ladder, top down, after League of Legends ranked. Floors are a first
 * draft — tune them once real data is backfilled (checkpoint 2) and change
 * them only here.
 */
export const TIERS: readonly Tier[] = [
  { level: 0, id: "challenger", name: "챌린저", minManwon: 50 * EOK, seats: 1 },
  { level: 1, id: "grandmaster", name: "그랜드마스터", minManwon: 35 * EOK, seats: 2 },
  { level: 2, id: "master", name: "마스터", minManwon: 30 * EOK },
  { level: 3, id: "diamond", name: "다이아몬드", minManwon: 25 * EOK },
  { level: 4, id: "emerald", name: "에메랄드", minManwon: 20 * EOK },
  { level: 5, id: "platinum", name: "플래티넘", minManwon: 16 * EOK },
  { level: 6, id: "gold", name: "골드", minManwon: 12 * EOK },
  { level: 7, id: "silver", name: "실버", minManwon: 9 * EOK },
  { level: 8, id: "bronze", name: "브론즈", minManwon: 6 * EOK },
  { level: 9, id: "iron", name: "아이언", minManwon: 0 },
];

const [CHALLENGER, GRANDMASTER, MASTER] = TIERS;

/** Iron's divisions count up from here; anything cheaper is Iron IV at 0 LP. */
const IRON_FLOOR = 3 * EOK;
/** Above master's floor there are no divisions: one LP per 100만원. */
const APEX_LP_STEP = 100;

export interface Standing {
  /** 1-based place among every priced entry. */
  rank: number;
  tier: Tier;
  /** null for the apex tiers (master and up), which have no divisions. */
  division: Division | null;
  /** League points: 0–99 inside a division; above 30억, one per 100만원. */
  lp: number;
  /** 만원 still to climb for the next division, tier or seat; null for the challenger. */
  toNext: number | null;
}

/** The tier a price earns on its own. Apex seats are handed out by `rankStandings`. */
export function bandTier(priceManwon: number): Tier {
  return TIERS.slice(2).find((t) => priceManwon >= t.minManwon)!;
}

function place(tier: Tier, priceManwon: number): { division: Division; lp: number; nextFloor: number } {
  const top = TIERS[tier.level - 1].minManwon;
  const bottom = tier.id === "iron" ? IRON_FLOOR : tier.minManwon;
  const width = (top - bottom) / 4;
  const steps = Math.max(0, Math.min(3, Math.floor((priceManwon - bottom) / width)));
  const floor = bottom + steps * width;
  const lp = priceManwon < bottom ? 0 : Math.min(99, Math.floor(((priceManwon - floor) / width) * 100));
  return { division: (4 - steps) as Division, lp, nextFloor: floor + width };
}

/**
 * Rank every priced entry and give it a tier, division and LP. The first place
 * at 50억 or more takes the one challenger seat; the next two at 35억 or more
 * take the grandmaster seats; everyone else earns the tier of their price.
 */
export function rankStandings(entries: Array<{ key: string; priceManwon: number | null }>): Map<string, Standing> {
  const priced = entries
    .filter((e): e is { key: string; priceManwon: number } => e.priceManwon !== null)
    .sort((a, b) => b.priceManwon - a.priceManwon || a.key.localeCompare(b.key));

  const seated: Tier[] = [];
  let challengers = CHALLENGER.seats!;
  let grandmasters = GRANDMASTER.seats!;
  for (const e of priced) {
    if (challengers > 0 && e.priceManwon >= CHALLENGER.minManwon) {
      challengers--;
      seated.push(CHALLENGER);
    } else if (grandmasters > 0 && e.priceManwon >= GRANDMASTER.minManwon) {
      grandmasters--;
      seated.push(GRANDMASTER);
    } else {
      seated.push(bandTier(e.priceManwon));
    }
  }

  const holders = (tier: Tier) => priced.filter((_, i) => seated[i] === tier).map((e) => e.priceManwon);
  const throne = holders(CHALLENGER)[0];
  const gmSeats = holders(GRANDMASTER);
  const lowestGm = gmSeats.length === GRANDMASTER.seats ? gmSeats[gmSeats.length - 1] : undefined;

  const out = new Map<string, Standing>();
  priced.forEach((e, i) => {
    const tier = seated[i];
    const price = e.priceManwon;
    if (tier.level <= MASTER.level) {
      const lp = Math.floor((price - MASTER.minManwon) / APEX_LP_STEP);
      const target =
        tier === CHALLENGER
          ? null
          : tier === GRANDMASTER
            ? Math.max(CHALLENGER.minManwon, throne ?? 0)
            : Math.max(GRANDMASTER.minManwon, lowestGm ?? 0);
      out.set(e.key, { rank: i + 1, tier, division: null, lp, toNext: target === null ? null : target - price });
    } else {
      const { division, lp, nextFloor } = place(tier, price);
      out.set(e.key, { rank: i + 1, tier, division, lp, toNext: nextFloor - price });
    }
  });
  return out;
}
