import { isNewHigh, previousHigh } from "./records";
import { BASE_BAND, isQualifying, type SizeBand, type StatTrade } from "./representative";
import type { RegionSnapshot } from "./snapshot";
import type { TierLevel } from "./tiers";

export type EditionEvent =
  | { type: "TIER_UP" | "TIER_DOWN"; regionSlug: string; fromLevel: TierLevel; toLevel: TierLevel; priceManwon: number }
  | {
      type: "NEW_TRADE";
      regionSlug: string;
      aptSeq: string;
      aptName: string;
      priceManwon: number;
      dealDate: string;
      floor: number;
      areaM2: number;
      dealingType: string | null;
      /** Reference size (84㎡형) — the ones that move the board. */
      base: boolean;
    }
  | {
      type: "NEW_HIGH";
      regionSlug: string;
      aptSeq: string;
      aptName: string;
      priceManwon: number;
      previousHigh: number;
      dealDate: string;
      floor: number;
    }
  | {
      type: "HIGH_CANCELLED";
      regionSlug: string;
      aptSeq: string;
      aptName: string;
      priceManwon: number;
      dealDate: string;
      cancelledOn: string;
      previousHigh: number;
    };

interface Leader {
  aptSeq: string;
  name: string;
}

/** Compare today's tiers with the previous edition's. New or price-less regions have no move. */
export function tierEvents(previous: Map<string, TierLevel>, snapshots: RegionSnapshot[]): EditionEvent[] {
  const events: EditionEvent[] = [];
  for (const s of snapshots) {
    const before = previous.get(s.regionSlug);
    const now = s.standing?.tier.level;
    if (before === undefined || now === undefined || !s.rep || now === before) continue;
    events.push({
      type: now < before ? "TIER_UP" : "TIER_DOWN",
      regionSlug: s.regionSlug,
      fromLevel: before,
      toLevel: now,
      priceManwon: s.rep.priceManwon,
    });
  }
  return events;
}

/** Trades first seen in this run for a region's leader; `history` must include them. */
export function tradeEvents(
  regionSlug: string,
  leader: Leader,
  newTrades: StatTrade[],
  history: StatTrade[],
  band: SizeBand = BASE_BAND,
): EditionEvent[] {
  const events: EditionEvent[] = [];
  for (const deal of newTrades) {
    if (deal.cancelled || deal.removed) continue;
    events.push({
      type: "NEW_TRADE",
      regionSlug,
      aptSeq: leader.aptSeq,
      aptName: leader.name,
      priceManwon: deal.priceManwon,
      dealDate: deal.dealDate,
      floor: deal.floor,
      areaM2: deal.areaM2,
      dealingType: deal.dealingType,
      base: isQualifying(deal, band),
    });
    if (isNewHigh(deal, history, band)) {
      events.push({
        type: "NEW_HIGH",
        regionSlug,
        aptSeq: leader.aptSeq,
        aptName: leader.name,
        priceManwon: deal.priceManwon,
        previousHigh: previousHigh(deal, history, band)!,
        dealDate: deal.dealDate,
        floor: deal.floor,
      });
    }
  }
  return events;
}

/** A deal cancelled in this run that, had it stood, was a record — the "신고가 찍고 취소" story. */
export function cancellationEvents(
  regionSlug: string,
  leader: Leader,
  newlyCancelled: Array<{ trade: StatTrade; cancelledOn: string }>,
  history: StatTrade[],
  band: SizeBand = BASE_BAND,
): EditionEvent[] {
  const events: EditionEvent[] = [];
  for (const { trade, cancelledOn } of newlyCancelled) {
    const asLive = { ...trade, cancelled: false };
    if (!isQualifying(asLive, band)) continue;
    const prev = previousHigh(asLive, history, band);
    if (prev === null || trade.priceManwon <= prev) continue;
    events.push({
      type: "HIGH_CANCELLED",
      regionSlug,
      aptSeq: leader.aptSeq,
      aptName: leader.name,
      priceManwon: trade.priceManwon,
      dealDate: trade.dealDate,
      cancelledOn,
      previousHigh: prev,
    });
  }
  return events;
}
