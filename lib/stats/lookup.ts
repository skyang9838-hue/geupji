import { rankStandings, type LadderEntry, type Standing } from "./tiers";

const MINE = "\u0000mine";

export interface Placement {
  /** Where the complex would stand if it joined today's ladder. */
  standing: Standing;
  /** Ladder key right above it, or null at the top. */
  above: string | null;
  /** Ladder key right below it, or null at the bottom. */
  below: string | null;
}

/**
 * "내 아파트": drop one outside complex into today's ladder and read off its
 * 급지, tier and rank. It is never an anchor or a hand-picked challenger, so the
 * ladder's 급지 1.0 stays put.
 */
export function placeAmong(ladder: LadderEntry[], priceManwon: number): Placement | null {
  if (!(priceManwon > 0)) return null;
  const all = rankStandings([...ladder, { key: MINE, priceManwon }]);
  const standing = all.get(MINE);
  if (!standing) return null;
  const byRank = new Map([...all].map(([key, s]) => [s.rank, key]));
  return {
    standing,
    above: byRank.get(standing.rank - 1) ?? null,
    below: byRank.get(standing.rank + 1) ?? null,
  };
}
