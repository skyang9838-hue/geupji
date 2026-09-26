import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { KeyedTrade } from "@/lib/molit/dedupe";
import type { FetchTarget } from "@/lib/molit/plan";

export interface ApplyResult {
  insertedIds: number[];
  updated: number;
  newlyCancelled: Array<{ id: number; cancelledOn: string | null }>;
}

export const tradeKey = (t: { sourceKey: string; occurrence: number }) => `${t.sourceKey}#${t.occurrence}`;

const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);
const toIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Write one fetched batch: new trades are inserted, known ones get their
 * later-filled fields (cancellation, registration, building, district code)
 * brought up to date, and anything previously marked removed is restored.
 */
export async function applyTrades(db: PrismaClient, trades: KeyedTrade[]): Promise<ApplyResult> {
  if (trades.length === 0) return { insertedIds: [], updated: 0, newlyCancelled: [] };

  await upsertComplexes(db, trades);

  const existing = await db.trade.findMany({
    where: { sourceKey: { in: [...new Set(trades.map((t) => t.sourceKey))] } },
    select: {
      id: true,
      sourceKey: true,
      occurrence: true,
      sggCd: true,
      cancelled: true,
      cancelledOn: true,
      registeredOn: true,
      aptDong: true,
      removedAt: true,
    },
  });
  const byKey = new Map(existing.map((e) => [tradeKey(e), e]));

  const inserts: Prisma.TradeCreateManyInput[] = [];
  const updates = [];
  const newlyCancelled: ApplyResult["newlyCancelled"] = [];

  for (const t of trades) {
    const known = byKey.get(tradeKey(t));
    if (!known) {
      inserts.push({
        sourceKey: t.sourceKey,
        occurrence: t.occurrence,
        aptSeq: t.aptSeq,
        sggCd: t.sggCd,
        dealYm: t.dealDate.slice(0, 4) + t.dealDate.slice(5, 7),
        dealDate: toDate(t.dealDate)!,
        areaM2: t.areaM2,
        floor: t.floor,
        priceManwon: t.priceManwon,
        dealingType: t.dealingType,
        buyerType: t.buyerType,
        sellerType: t.sellerType,
        cancelled: t.cancelled,
        cancelledOn: toDate(t.cancelledOn),
        registeredOn: toDate(t.registeredOn),
        aptDong: t.aptDong,
      });
      continue;
    }

    const changed =
      known.sggCd !== t.sggCd ||
      known.cancelled !== t.cancelled ||
      toIso(known.cancelledOn) !== t.cancelledOn ||
      toIso(known.registeredOn) !== t.registeredOn ||
      known.aptDong !== t.aptDong ||
      known.removedAt !== null;
    if (!changed) continue;

    updates.push(
      db.trade.update({
        where: { id: known.id },
        data: {
          sggCd: t.sggCd,
          cancelled: t.cancelled,
          cancelledOn: toDate(t.cancelledOn),
          registeredOn: toDate(t.registeredOn),
          aptDong: t.aptDong,
          removedAt: null,
        },
      }),
    );
    if (!known.cancelled && t.cancelled) newlyCancelled.push({ id: known.id, cancelledOn: t.cancelledOn });
  }

  const created = inserts.length ? await db.trade.createManyAndReturn({ data: inserts, select: { id: true } }) : [];
  if (updates.length) await db.$transaction(updates);

  return { insertedIds: created.map((c) => c.id), updated: updates.length, newlyCancelled };
}

async function upsertComplexes(db: PrismaClient, trades: KeyedTrade[]): Promise<void> {
  const latest = new Map<string, KeyedTrade>();
  for (const t of trades) latest.set(t.aptSeq, t);

  const existing = await db.complex.findMany({ where: { aptSeq: { in: [...latest.keys()] } } });
  const known = new Map(existing.map((c) => [c.aptSeq, c]));

  const creates = [];
  const updates = [];
  for (const t of latest.values()) {
    const fields = {
      name: t.aptName,
      sggCd: t.sggCd,
      umdName: t.umdName,
      jibun: t.jibun,
      roadName: t.roadName,
      buildYear: t.buildYear,
    };
    const c = known.get(t.aptSeq);
    if (!c) {
      creates.push({ aptSeq: t.aptSeq, ...fields });
    } else if (
      c.name !== fields.name ||
      c.sggCd !== fields.sggCd ||
      c.umdName !== fields.umdName ||
      c.jibun !== fields.jibun ||
      c.roadName !== fields.roadName ||
      c.buildYear !== fields.buildYear
    ) {
      updates.push(db.complex.update({ where: { aptSeq: t.aptSeq }, data: fields }));
    }
  }
  if (creates.length) await db.complex.createMany({ data: creates, skipDuplicates: true });
  if (updates.length) await db.$transaction(updates);
}

/**
 * After a run, a trade still filed under a fetched (code, month) but absent
 * from everything the run saw has been withdrawn or corrected at the source.
 */
export async function reconcileRemoved(
  db: PrismaClient,
  fetched: FetchTarget[],
  seen: Set<string>,
): Promise<number> {
  let removed = 0;
  for (const { code, ym } of fetched) {
    const rows = await db.trade.findMany({
      where: { sggCd: code, dealYm: ym, removedAt: null },
      select: { id: true, sourceKey: true, occurrence: true },
    });
    const gone = rows.filter((r) => !seen.has(tradeKey(r))).map((r) => r.id);
    if (gone.length) {
      const res = await db.trade.updateMany({ where: { id: { in: gone } }, data: { removedAt: new Date() } });
      removed += res.count;
    }
  }
  return removed;
}
