import type { LadderPoint, RegionFacts, RegionSnapshot, SeasonRecord } from "./snapshot";
import { rankStandings, type Standing } from "./tiers";

/**
 * Rank the edition's regions against each other: today, at every month end
 * of their history (the ladder), and at the close of every year (seasons,
 * the current year's season still running).
 */
export function rankEdition(facts: RegionFacts[]): RegionSnapshot[] {
  const today = rankStandings(facts.map((f) => ({ key: f.regionSlug, priceManwon: f.rep?.priceManwon ?? null })));

  const months = [...new Set(facts.flatMap((f) => f.history.map((h) => h.ym)))].sort();
  const priceAt = facts.map((f) => new Map(f.history.map((h) => [h.ym, h.priceManwon])));
  const byMonth: Map<string, Standing>[] = months.map((ym) =>
    rankStandings(facts.map((f, i) => ({ key: f.regionSlug, priceManwon: priceAt[i].get(ym) ?? null }))),
  );

  // the last month of each year closes its season
  const closing = new Map<number, number>();
  months.forEach((ym, i) => closing.set(Number(ym.slice(0, 4)), i));

  return facts.map((f, i) => {
    const ladder: LadderPoint[] = months.map((ym, m) => {
      const s = byMonth[m].get(f.regionSlug);
      return { ym, rank: s?.rank ?? null, level: s?.tier.level ?? null };
    });
    const seasons: SeasonRecord[] = [];
    for (const [year, m] of closing) {
      const s = byMonth[m].get(f.regionSlug);
      const price = priceAt[i].get(months[m]);
      if (s && price != null) seasons.push({ year, level: s.tier.level, division: s.division, priceManwon: price });
    }
    return { ...f, standing: today.get(f.regionSlug) ?? null, ladder, seasons };
  });
}
