import Link from "next/link";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { formatKoreanDate } from "@/lib/format/date";
import styles from "./TopBar.module.css";

const NAV = [
  { href: "/", label: "랭킹", key: "ranking" },
  { href: "/compare", label: "비교", key: "compare" },
  { href: "/about", label: "기준", key: "about" },
] as const;

export type NavKey = (typeof NAV)[number]["key"];

export function TopBar({ current, asOf }: { current?: NavKey; asOf?: string | null }) {
  const sample = process.env.NEXT_PUBLIC_SAMPLE_DATA === "1";
  return (
    <>
      {sample && (
        <p className={styles.sample} role="note">
          <strong>견본 데이터</strong> 단지 이름과 가격은 모두 가상이에요. 실제 실거래가가 아니에요.
        </p>
      )}
      <header className={styles.bar}>
        <div className={`page ${styles.inner}`}>
          <Link href="/" className={styles.brand} aria-label="급지.gg 처음으로">
            <TierEmblem tier="brand" size={26} />
            <span className={styles.word}>급지</span>
            <span className={styles.tld}>.gg</span>
          </Link>
          <nav className={styles.nav} aria-label="주 메뉴">
            {NAV.map((item) => (
              <Link key={item.key} href={item.href} aria-current={current === item.key ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          {asOf && <p className={styles.asOf}>{formatKoreanDate(asOf)} 실거래 기준</p>}
        </div>
      </header>
    </>
  );
}
