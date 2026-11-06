import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import type { EditionEvent } from "@/lib/stats/events";
import type { RegionSnapshot } from "@/lib/stats/snapshot";

/** Every page reads through here; the ingest job expires the "edition" tag. */
const EDITION_TAG = "edition";

export interface EditionView {
  number: number;
  asOf: string;
  updatedAt: string;
  snapshots: RegionSnapshot[];
  events: EditionEvent[];
}

export async function getLatestEdition(): Promise<EditionView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(EDITION_TAG);

  const e = await prisma.edition.findFirst({ orderBy: { asOf: "desc" } });
  if (!e) return null;
  return {
    number: e.number,
    asOf: e.asOf.toISOString().slice(0, 10),
    updatedAt: e.updatedAt.toISOString(),
    snapshots: e.snapshots as unknown as RegionSnapshot[],
    events: e.events as unknown as EditionEvent[],
  };
}

export interface TradeView {
  dealDate: string;
  areaM2: number;
  floor: number;
  priceManwon: number;
  dealingType: string | null;
  cancelled: boolean;
  cancelledOn: string | null;
  registeredOn: string | null;
  removed: boolean;
}

/** All trades of one complex, oldest first. */
export async function getComplexTrades(aptSeq: string): Promise<TradeView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(EDITION_TAG);

  const rows = await prisma.trade.findMany({
    where: { aptSeq },
    orderBy: { dealDate: "asc" },
    select: {
      dealDate: true,
      areaM2: true,
      floor: true,
      priceManwon: true,
      dealingType: true,
      cancelled: true,
      cancelledOn: true,
      registeredOn: true,
      removedAt: true,
    },
  });
  return rows.map((r) => ({
    dealDate: r.dealDate.toISOString().slice(0, 10),
    areaM2: r.areaM2,
    floor: r.floor,
    priceManwon: r.priceManwon,
    dealingType: r.dealingType,
    cancelled: r.cancelled,
    cancelledOn: r.cancelledOn ? r.cancelledOn.toISOString().slice(0, 10) : null,
    registeredOn: r.registeredOn ? r.registeredOn.toISOString().slice(0, 10) : null,
    removed: r.removedAt !== null,
  }));
}

export interface ComplexHit {
  aptSeq: string;
  name: string;
  umdName: string;
  sggCd: string;
  buildYear: number | null;
  /** Trades in the last year: busy complexes come first. */
  recent: number;
}

/** "내 아파트" search: complexes whose name holds the words, spaces ignored. */
export async function searchComplexes(query: string, asOf: string): Promise<ComplexHit[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(EDITION_TAG);

  const needle = query.replace(/\s+/g, "");
  if (needle.length < 2) return [];
  const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const since = new Date(`${asOf}T00:00:00Z`);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  const rows = await prisma.$queryRaw<Array<Omit<ComplexHit, "recent"> & { recent: bigint }>>`
    SELECT c."aptSeq", c."name", c."umdName", c."sggCd", c."buildYear",
           COUNT(t."id") FILTER (WHERE t."dealDate" >= ${since}) AS recent
    FROM "Complex" c
    LEFT JOIN "Trade" t ON t."aptSeq" = c."aptSeq"
    WHERE REPLACE(c."name", ' ', '') ILIKE ${pattern}
    GROUP BY c."aptSeq"
    ORDER BY recent DESC, c."name"
    LIMIT 20`;
  return rows.map((r) => ({ ...r, recent: Number(r.recent) }));
}

export async function getComplex(aptSeq: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(EDITION_TAG);

  return prisma.complex.findUnique({
    where: { aptSeq },
    select: { aptSeq: true, name: true, umdName: true, sggCd: true, buildYear: true },
  });
}
