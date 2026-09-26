import { Prisma, type Edition, type IngestRun, type PrismaClient } from "@/generated/prisma/client";
import type { RegionDef } from "@/data/regions";
import { keyTrades } from "@/lib/molit/dedupe";
import { normalizeTrade, type NormalizedTrade } from "@/lib/molit/normalize";
import { MolitApiError, type RawTradeItem } from "@/lib/molit/parse";
import { fetchPlan, type FetchTarget } from "@/lib/molit/plan";
import { publishEdition, type RunOutcome } from "./edition";
import { applyTrades, reconcileRemoved, tradeKey } from "./store";

export interface IngestOptions {
  kind: "daily" | "backfill";
  regions: RegionDef[];
  fromYm: string;
  toYm: string;
  /** Data date of the edition this run prints (KST), `YYYY-MM-DD`. */
  asOf: string;
  fetcher: (target: FetchTarget) => Promise<RawTradeItem[]>;
  log?: (message: string) => void;
}

interface Failure extends FetchTarget {
  error: string;
}

/**
 * One collection run: months queued by earlier failures first, then the
 * plan. Each month is stored as it arrives, so a crash loses nothing that
 * was already written. A key or parameter error aborts the whole run —
 * every other request would fail the same way.
 */
export async function runIngest(
  db: PrismaClient,
  { kind, regions, fromYm, toYm, asOf, fetcher, log = () => {} }: IngestOptions,
): Promise<{ run: IngestRun; edition: Edition }> {
  const run = await db.ingestRun.create({ data: { kind, status: "running" } });

  const pending = await db.pendingFetch.findMany({ orderBy: [{ ym: "asc" }, { code: "asc" }] });
  const targets = uniqueTargets([...pending.map(({ code, ym }) => ({ code, ym })), ...fetchPlan(regions, fromYm, toYm)]);

  const seen = new Set<string>();
  const succeeded: FetchTarget[] = [];
  const failures: Failure[] = [];
  const outcome: RunOutcome = { insertedIds: [], newlyCancelled: [] };
  let requests = 0;
  let fetched = 0;
  let updated = 0;

  try {
    for (const target of targets) {
      requests += 1;
      let items: RawTradeItem[];
      try {
        items = await fetcher(target);
      } catch (error) {
        if (error instanceof MolitApiError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ ...target, error: message });
        log(`✗ ${target.code} ${target.ym}: ${message}`);
        await db.pendingFetch.upsert({
          where: { code_ym: target },
          create: { ...target, attempts: 1, lastError: message },
          update: { attempts: { increment: 1 }, lastError: message },
        });
        continue;
      }

      const normalized: NormalizedTrade[] = [];
      for (const item of items) {
        try {
          normalized.push(normalizeTrade(item));
        } catch (error) {
          log(`  skipped item in ${target.code} ${target.ym}: ${(error as Error).message}`);
        }
      }
      const keyed = keyTrades(normalized);
      for (const t of keyed) seen.add(tradeKey(t));

      const result = await applyTrades(db, keyed);
      fetched += items.length;
      updated += result.updated;
      outcome.insertedIds.push(...result.insertedIds);
      outcome.newlyCancelled.push(...result.newlyCancelled);
      succeeded.push(target);
      await db.pendingFetch.deleteMany({ where: target });
      log(`✓ ${target.code} ${target.ym}: ${items.length} trades, +${result.insertedIds.length} new, ${result.updated} updated`);
    }
  } catch (error) {
    await db.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        requests,
        fetched,
        inserted: outcome.insertedIds.length,
        updated,
        failures: [...failures, { code: "*", ym: "*", error: (error as Error).message }] as unknown as Prisma.InputJsonValue,
      },
    });
    throw error;
  }

  const removed = await reconcileRemoved(db, succeeded, seen);
  const edition = await publishEdition(db, { asOf, regions, run: outcome });

  const finished = await db.ingestRun.update({
    where: { id: run.id },
    data: {
      status: failures.length ? "partial" : "ok",
      finishedAt: new Date(),
      requests,
      fetched,
      inserted: outcome.insertedIds.length,
      updated,
      removed,
      failures: failures.length ? (failures as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
  return { run: finished, edition };
}

function uniqueTargets(targets: FetchTarget[]): FetchTarget[] {
  const seen = new Set<string>();
  return targets.filter(({ code, ym }) => {
    const key = `${code}:${ym}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
