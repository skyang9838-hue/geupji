import { TierBoard } from "@/components/board/TierBoard";
import { RankFlow } from "@/components/charts/RankFlow";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { REGIONS } from "@/data/regions";
import { formatKoreanDate } from "@/lib/format/date";
import { getLatestEdition } from "@/lib/queries";
import { TIERS, type Tier } from "@/lib/stats/tiers";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
import styles from "./page.module.css";

const EOK = 10000;

export default async function RankingPage() {
  const edition = await getLatestEdition();

  if (!edition) {
    return (
      <>
        <TopBar current="ranking" />
        <main className={`page ${styles.empty}`}>
          <h1>첫 순위를 매기는 중이에요</h1>
          <p>실거래 자료를 처음 받아오면 이 자리에 티어표가 올라와요.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const ranked = edition.snapshots.filter((s) => s.standing);
  const [challenger, grandmaster] = TIERS;

  return (
    <>
      <TopBar current="ranking" asOf={edition.asOf} />
      <main className="page">
        <section className={styles.hero} aria-labelledby="title">
          <div>
            <h1 id="title" className={styles.title}>
              수도권 대장아파트 티어
            </h1>
            <p className={styles.lede}>
              대장 단지의 전용 84㎡ 실거래 대표가로 매긴 롤 티어예요. {ranked.length}곳 ·{" "}
              {formatKoreanDate(edition.asOf)} 실거래 기준
            </p>
          </div>
          <dl className={styles.cutoffs}>
            <Cutoff tier={challenger} snapshots={ranked} />
            <Cutoff tier={grandmaster} snapshots={ranked} />
          </dl>
        </section>

        <TierBoard snapshots={edition.snapshots} regions={REGIONS} />

        <section className={styles.section} aria-labelledby="flow-title">
          <header className="section-head">
            <h2 id="flow-title">순위 변동</h2>
            <p>최근 12개월 월말 순위 · 선을 가리키면 그 단지만 보여요</p>
          </header>
          <RankFlow snapshots={edition.snapshots} regions={REGIONS} />
        </section>

        <section className={styles.section} aria-labelledby="board-title">
          <header className="section-head">
            <h2 id="board-title">전체 순위</h2>
            <p>84㎡ 대표가 = 최근 90일 정상 거래의 중위값 · 해제·직거래 제외</p>
          </header>
          <Leaderboard snapshots={edition.snapshots} regions={REGIONS} events={edition.events} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** op.gg-style cutoff: what it takes to sit in a seated tier today. */
function Cutoff({ tier, snapshots }: { tier: Tier; snapshots: RegionSnapshot[] }) {
  const holders = snapshots.filter((s) => s.standing!.tier.id === tier.id).map((s) => s.rep!.priceManwon);
  const full = holders.length === tier.seats;
  const cut = full ? Math.min(...holders) : tier.minManwon;
  return (
    <div className={styles.cutoff}>
      <dt>
        <TierEmblem tier={tier.id} size={30} />
        {tier.name} 컷
      </dt>
      <dd>
        <span className="num">{(cut / EOK).toFixed(2)}</span>억
        <small>
          {tier.seats}자리 {full ? "· 만석" : `중 ${holders.length}자리 찼음`}
        </small>
      </dd>
    </div>
  );
}
