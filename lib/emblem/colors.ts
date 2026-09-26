import type { TierId } from "@/lib/stats/tiers";

/**
 * One accent per tier, after League's ranked colors, tuned for the night
 * surface. Accents mark identity beside a name or crest; they never carry
 * meaning alone (ten classes are too many for color).
 */
export const TIER_COLOR: Record<TierId, string> = {
  challenger: "#f2c75c",
  grandmaster: "#ef4f5a",
  master: "#b45cf0",
  diamond: "#6f8bff",
  emerald: "#5bc452",
  platinum: "#2fbfd6",
  gold: "#e8a93a",
  silver: "#aeb8cc",
  bronze: "#c07f55",
  iron: "#857f92",
};
