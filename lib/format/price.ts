/** Prices are stored in 만원 (MOLIT's unit). 1억 = 10,000만원. */
const EOK = 10000;
const MINUS = "−"; // U+2212, the typographic minus

const grouped = new Intl.NumberFormat("ko-KR");

export function formatEok(
  manwon: number,
  { decimals = 1, fixed = false }: { decimals?: number; fixed?: boolean } = {},
): string {
  const value = (manwon / EOK).toFixed(decimals);
  return `${fixed ? value : String(Number(value))}억`;
}

/** "23억 4,500만 원" — the form used in running text. */
export function formatKoreanPrice(manwon: number): string {
  const eok = Math.floor(manwon / EOK);
  const man = manwon % EOK;
  if (eok === 0) return `${grouped.format(man)}만 원`;
  return man === 0 ? `${eok}억 원` : `${eok}억 ${grouped.format(man)}만 원`;
}

export interface FormattedChange {
  direction: "up" | "down" | "flat";
  arrow: "▲" | "▼" | "–";
  text: string;
}

/** Korean market convention: rises ▲ (red), falls ▼ (blue). The arrow carries meaning without color. */
export function formatChange(diffManwon: number): FormattedChange {
  if (diffManwon === 0) return { direction: "flat", arrow: "–", text: "0" };
  const size = Math.abs(diffManwon);
  const text = size >= EOK ? formatEok(size) : `${grouped.format(size)}만`;
  return diffManwon > 0
    ? { direction: "up", arrow: "▲", text }
    : { direction: "down", arrow: "▼", text };
}

export function formatPercent(ratio: number, { signed = true }: { signed?: boolean } = {}): string {
  const value = (Math.abs(ratio) * 100).toFixed(1);
  if (!signed) return `${ratio < 0 ? MINUS : ""}${value}%`;
  return `${ratio < 0 ? MINUS : "+"}${value}%`;
}
