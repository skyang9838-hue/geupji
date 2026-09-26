/**
 * Print the stored editions: each region's rank, tier and price, and the events.
 *
 *   npx tsx scripts/inspect-edition.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("@/lib/db");
  type Snap = import("@/lib/stats/snapshot").RegionSnapshot;
  type Ev = import("@/lib/stats/events").EditionEvent;

  const editions = await prisma.edition.findMany({ orderBy: { number: "asc" } });
  for (const e of editions) {
    console.log(`\n판 ${e.number} ${e.asOf.toISOString().slice(0, 10)}`);
    const ranked = (e.snapshots as unknown as Snap[]).slice().sort((a, b) => (a.standing?.rank ?? 99) - (b.standing?.rank ?? 99));
    for (const s of ranked) {
      const rep = s.rep ? `${(s.rep.priceManwon / 10000).toFixed(2)}억 (${s.rep.windowDays ?? "stale"}일/${s.rep.count}건)` : "-";
      const st = s.standing;
      const tier = st ? `${st.tier.name}${st.division ? ` ${["", "I", "II", "III", "IV"][st.division]}` : ""} ${st.lp}LP` : "-";
      console.log(`  ${String(st?.rank ?? "-").padStart(2)} ${s.regionSlug.padEnd(12)} ${tier.padEnd(16)} ${rep}  ${s.leader?.name ?? ""}`);
    }
    const events = e.events as unknown as Ev[];
    console.log(`  events: ${events.map((ev) => `${ev.type}:${ev.regionSlug}`).join(", ") || "none"}`);
  }
  await prisma.$disconnect();
}

main();
