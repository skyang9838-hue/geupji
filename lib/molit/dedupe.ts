import type { NormalizedTrade } from "./normalize";

export interface KeyedTrade extends NormalizedTrade {
  /** Stable identity built from fields that never change after a deal is reported. */
  sourceKey: string;
  /** Index among identical deals in one month (the API has no trade id). */
  occurrence: number;
}

/**
 * MOLIT publishes no trade id, so a trade is identified by the fields fixed at
 * contract time. Cancellation, registration and building number arrive later
 * and must not change the identity; neither may the district code, which
 * changes when a city is split into 구 (e.g. 화성시 → 동탄구, 2026).
 */
export function sourceKeyOf(t: NormalizedTrade): string {
  return [
    t.aptSeq,
    t.dealDate,
    t.areaM2.toFixed(3),
    t.floor,
    t.priceManwon,
    t.dealingType ?? "",
    t.buyerType ?? "",
    t.sellerType ?? "",
  ].join("|");
}

export function keyTrades(trades: NormalizedTrade[]): KeyedTrade[] {
  const groups = new Map<string, NormalizedTrade[]>();
  for (const t of trades) {
    const key = sourceKeyOf(t);
    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }

  const keyed: KeyedTrade[] = [];
  for (const [sourceKey, group] of groups) {
    // Identical deals are interchangeable; order them by their later-filled
    // fields so the same set always maps to the same occurrence numbers.
    group
      .slice()
      .sort((a, b) => mutableRank(a).localeCompare(mutableRank(b)))
      .forEach((t, occurrence) => keyed.push({ ...t, sourceKey, occurrence }));
  }
  return keyed;
}

function mutableRank(t: NormalizedTrade): string {
  return [t.cancelled ? "1" : "0", t.cancelledOn ?? "", t.registeredOn ?? "", t.aptDong ?? ""].join("|");
}
