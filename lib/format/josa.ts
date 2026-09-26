/**
 * Attach a Korean particle that depends on the final consonant (받침):
 * withJosa("잠실", "과/와") → "잠실과", withJosa("마포", "과/와") → "마포와".
 * The pair is written "with-batchim/without-batchim".
 */
export function withJosa(word: string, pair: "과/와" | "은/는" | "이/가" | "을/를"): string {
  const [closed, open] = pair.split("/");
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hangul = code >= 0 && code <= 11171;
  return word + (hangul && code % 28 !== 0 ? closed : open);
}
