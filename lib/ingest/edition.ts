import { Prisma, type Edition, type PrismaClient } from "@/generated/prisma/client";
import type { RegionDef } from "@/data/regions";
import { cancellationEvents, tierEvents, tradeEvents, type EditionEvent } from "@/lib/stats/events";
import { BASE_BAND, shiftDate, type StatTrade } from "@/lib/stats/representative";
import { rankEdition } from "@/lib/stats/ladder";
import { buildRegionSnapshot, type RegionFacts, type RegionSnapshot } from "@/lib/stats/snapshot";
import type { TierLevel } from "@/lib/stats/tiers";
import type { ApplyResult } from "./store";

export interface RunOutcome {
  insertedIds: ApplyResult["insertedIds"];
  newlyCancelled: ApplyResult["newlyCancelled"];
}

/** Contracts signed longer ago than this are history, not today's trades (filing deadline is 30 days). */
const RECENT_WINDOW_DAYS = 60;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const json = (value: unknown) => value as Prisma.InputJsonValue;

/**
 * Rank the day's edition from what the database now holds.
 * One edition per data date: a later run the same day redoes it,
 * keeping the trades already reported and re-ranking the regions.
 */
export async function publishEdition(
  db: PrismaClient,
  { asOf, regions, run }: { asOf: string; regions: RegionDef[]; run: RunOutcome },
): Promise<Edition> {
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  const inserted = new Set(run.insertedIds);
  const cancelledOn = new Map(run.newlyCancelled.map((c) => [c.id, c.cancelledOn]));

  const previous = await db.edition.findFirst({ where: { asOf: { lt: asOfDate } }, orderBy: { asOf: "desc" } });
  const previousTiers = new Map<string, TierLevel>();
  for (const s of (previous?.snapshots ?? []) as unknown as Partial<RegionSnapshot>[]) {
    if (s.regionSlug && s.standing) previousTiers.set(s.regionSlug, s.standing.tier.level);
  }

  const facts: RegionFacts[] = [];
  const tradeEventsToday: EditionEvent[] = [];

  for (const region of regions) {
    const complexes = await db.complex.findMany({
      where: { umdName: { in: region.dongs }, sggCd: { in: region.districts.map((d) => d.code) } },
      include: { trades: { where: { dealDate: { lte: asOfDate } }, orderBy: { dealDate: "asc" } } },
    });

    const histories = complexes.map((c) => ({
      aptSeq: c.aptSeq,
      name: c.name,
      buildYear: c.buildYear,
      umdName: c.umdName,
      rows: c.trades,
      trades: c.trades.map(
        (t): StatTrade => ({
          dealDate: isoDay(t.dealDate),
          priceManwon: t.priceManwon,
          areaM2: t.areaM2,
          floor: t.floor,
          dealingType: t.dealingType,
          cancelled: t.cancelled,
          removed: t.removedAt !== null,
        }),
      ),
    }));

    const fact = buildRegionSnapshot(region, histories, asOf);
    facts.push(fact);

    const leader = fact.leader && histories.find((h) => h.aptSeq === fact.leader!.aptSeq);
    if (!leader) continue;

    const band = region.band ?? BASE_BAND;
    // A backfill "inserts" years of trades; only recently signed ones count as new.
    const recentSince = shiftDate(asOf, -RECENT_WINDOW_DAYS);
    const newTrades = leader.trades.filter((t, i) => inserted.has(leader.rows[i].id) && t.dealDate >= recentSince);
    const cancelled = leader.trades.flatMap((trade, i) => {
      const row = leader.rows[i];
      if (!cancelledOn.has(row.id)) return [];
      return [{ trade, cancelledOn: cancelledOn.get(row.id) ?? (row.cancelledOn ? isoDay(row.cancelledOn) : asOf) }];
    });

    tradeEventsToday.push(
      ...tradeEvents(region.slug, fact.leader!, newTrades, leader.trades, band),
      ...cancellationEvents(region.slug, fact.leader!, cancelled, leader.trades, band),
    );
  }

  const snapshots = rankEdition(facts);

  const existing = await db.edition.findUnique({ where: { asOf: asOfDate } });
  const earlierTrades = ((existing?.events ?? []) as unknown as EditionEvent[]).filter(
    (e) => e.type !== "TIER_UP" && e.type !== "TIER_DOWN",
  );
  // Tier moves are state: recompute against yesterday. Trades seen earlier today stay reported.
  const events = [...tierEvents(previousTiers, snapshots), ...uniqueEvents([...earlierTrades, ...tradeEventsToday])];

  const data = { snapshots: json(snapshots), events: json(events) };
  if (existing) return db.edition.update({ where: { id: existing.id }, data });

  const last = await db.edition.aggregate({ _max: { number: true } });
  return db.edition.create({ data: { ...data, number: (last._max.number ?? 0) + 1, asOf: asOfDate } });
}

function uniqueEvents(events: EditionEvent[]): EditionEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = JSON.stringify(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
