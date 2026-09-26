/**
 * Collect MOLIT apartment trades and print the day's edition.
 *
 *   npm run ingest                              # daily: this month and the two before
 *   npm run ingest -- --from 202101 --to 202609 # backfill a range
 *   npm run ingest -- --plan                    # show what would be requested, fetch nothing
 *
 * Needs DATABASE_URL and MOLIT_SERVICE_KEY. With SITE_URL and REVALIDATE_SECRET
 * set, the live site is told to refresh once the edition is published.
 */
import { config } from "dotenv";
import { parseArgs } from "node:util";

config({ path: ".env.local" });

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string" },
    plan: { type: "boolean", default: false },
  },
});

function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

async function main() {
  const { REGIONS } = await import("@/data/regions");
  const { fetchPlan, shiftMonth } = await import("@/lib/molit/plan");

  const asOf = todayKst();
  const thisMonth = asOf.slice(0, 4) + asOf.slice(5, 7);
  const toYm = values.to ?? thisMonth;
  const fromYm = values.from ?? shiftMonth(toYm, -2);
  const kind = values.from ? "backfill" : "daily";

  if (values.plan) {
    const plan = fetchPlan(REGIONS, fromYm, toYm);
    console.log(`${plan.length} requests for ${fromYm}–${toYm}:`);
    for (const t of plan) console.log(`  ${t.code} ${t.ym}`);
    return;
  }

  const serviceKey = process.env.MOLIT_SERVICE_KEY;
  if (!serviceKey) throw new Error("MOLIT_SERVICE_KEY is not set (공공데이터포털 일반 인증키, Decoding).");

  const { prisma } = await import("@/lib/db");
  const { fetchMonth } = await import("@/lib/molit/client");
  const { runIngest } = await import("@/lib/ingest/run");

  console.log(`ingest ${kind} ${fromYm}–${toYm}, edition date ${asOf}`);
  const started = Date.now();
  const { run, edition } = await runIngest(prisma, {
    kind,
    regions: REGIONS,
    fromYm,
    toYm,
    asOf,
    fetcher: (target) => fetchMonth(target, { serviceKey }),
    log: (line) => console.log(line),
  });

  console.log(
    `\n${run.status.toUpperCase()} in ${Math.round((Date.now() - started) / 1000)}s — ` +
      `${run.requests} requests, ${run.fetched} trades, +${run.inserted} new, ${run.updated} updated, ${run.removed} removed`,
  );
  console.log(`판 ${edition.number} · ${edition.asOf.toISOString().slice(0, 10)}`);

  await notifySite();
  await prisma.$disconnect();
  if (run.status !== "ok") process.exitCode = 2;
}

async function notifySite() {
  const { SITE_URL, REVALIDATE_SECRET } = process.env;
  if (!SITE_URL || !REVALIDATE_SECRET) return;
  const res = await fetch(new URL("/api/revalidate", SITE_URL), {
    method: "POST",
    headers: { "x-revalidate-secret": REVALIDATE_SECRET },
  });
  console.log(`site refresh: HTTP ${res.status}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
