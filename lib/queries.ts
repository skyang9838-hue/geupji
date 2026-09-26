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
