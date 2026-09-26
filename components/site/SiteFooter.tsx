import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <div className={styles.about}>
          <p className={styles.name}>
            급지<span>.gg</span>
          </p>
          <p>
            국토교통부 「아파트 매매 실거래가 상세 자료」를 매일 받아, 대장 단지의 전용 84㎡ 실거래 대표가로 티어를
            매겨요. 실거래 신고 기한이 30일이라 최근 한 달 치는 날마다 채워지고, 순위는 내일 바뀔 수 있어요.
          </p>
        </div>
        <div className={styles.notes}>
          <p>투자 권유가 아니에요. 티어는 가격 구간의 이름일 뿐, 동네나 사는 사람의 등급이 아니에요.</p>
          <p>티어 이름은 리그 오브 레전드에서 빌렸어요. Riot Games와는 관계없는 서비스예요.</p>
          <nav className={styles.links} aria-label="바닥글">
            <Link href="/about">티어 기준</Link>
            <Link href="/about#source">출처</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
