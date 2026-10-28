/**
 * Reprint the latest edition from trades already in the database — no fetching.
 * Use after changing data/regions.ts (leaders) or lib/stats/tiers.ts.
 *
 *   npx tsx scripts/republish.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { REGIONS } = await import("@/data/regions");
  const { prisma } = await import("@/lib/db");
  const { publishEdition } = await import("@/lib/ingest/edition");

  const latest = await prisma.edition.findFirst({ orderBy: { asOf: "desc" } });
  if (!latest) throw new Error("No edition yet — run ingest first.");
  const asOf = latest.asOf.toISOString().slice(0, 10);

  const edition = await publishEdition(prisma, { asOf, regions: REGIONS, run: { insertedIds: [], newlyCancelled: [] } });
  console.log(`판 ${edition.number} · ${asOf} 다시 발행`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
