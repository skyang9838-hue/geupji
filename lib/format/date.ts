const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

/** "9월 5일" */
export function formatKoreanDate(iso: string): string {
  const [, m, d] = parts(iso);
  return `${m}월 ${d}일`;
}

/** The dateline under the masthead: "2026년 9월 26일 토요일" */
export function formatEditionDate(iso: string): string {
  const [y, m, d] = parts(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${weekday}요일`;
}
