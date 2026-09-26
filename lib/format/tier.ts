import { TIERS, type Division, type Standing } from "@/lib/stats/tiers";

const ROMAN = ["", "I", "II", "III", "IV"] as const;
const grouped = new Intl.NumberFormat("ko-KR");

export function romanDivision(division: Division): string {
  return ROMAN[division];
}

/** "다이아몬드 II", or just "챌린저" for the apex tiers. */
export function formatTier(s: Standing): string {
  return s.division ? `${s.tier.name} ${romanDivision(s.division)}` : s.tier.name;
}

export function formatLp(s: Standing): string {
  return `${grouped.format(s.lp)} LP`;
}

/** "다이아몬드 I까지 5,500만" — the next rung and the money between. Null at the top. */
export function formatClimb(s: Standing): string | null {
  if (s.toNext === null) return null;
  const next =
    s.division && s.division > 1
      ? `${s.tier.name} ${romanDivision((s.division - 1) as Division)}`
      : TIERS[s.tier.level - 1].name;
  return `${next}까지 ${amount(s.toNext)}`;
}

/** "5,500만", "2억 9,000만", "15억" */
function amount(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const man = manwon % 10000;
  if (eok === 0) return `${grouped.format(man)}만`;
  return man === 0 ? `${eok}억` : `${eok}억 ${grouped.format(man)}만`;
}
