import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { getLatestEdition } from "@/lib/queries";
import { TIERS, type Tier } from "@/lib/stats/tiers";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "티어 기준",
  description: "급지.gg가 대장아파트의 티어를 매기는 방법: 84㎡ 대표가, 티어 구간, 디비전과 LP, 출처.",
};

const EOK = 10000;

export default async function AboutPage() {
  const edition = await getLatestEdition();
  const counts = new Map<string, number>();
  for (const s of edition?.snapshots ?? []) {
    if (s.standing) counts.set(s.standing.tier.id, (counts.get(s.standing.tier.id) ?? 0) + 1);
  }

  return (
    <>
      <TopBar current="about" asOf={edition?.asOf} />
      <main className={`page ${styles.page}`}>
        <header className={styles.head}>
          <h1>티어 기준</h1>
          <p>
            대장 단지마다 전용 84㎡ 실거래 대표가를 내고, 그 값으로 리그 오브 레전드 랭크처럼 티어를 매겨요. 사람이
            점수를 주지 않아요. 가격이 정해요.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="ladder-title">
          <h2 id="ladder-title">티어 10단계</h2>
          <ol className={styles.ladder}>
            {TIERS.map((tier) => (
              <li key={tier.id} style={{ "--c": `var(--t-${tier.id})` } as CSSProperties}>
                <TierEmblem tier={tier.id} size={56} />
                <div>
                  <p className={styles.tierName}>{tier.name}</p>
                  <p className={styles.tierRule}>{rule(tier)}</p>
                </div>
                <p className={styles.count}>
                  <span className="num">{counts.get(tier.id) ?? 0}</span>곳
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="rules-title">
          <h2 id="rules-title">어떻게 매기나요</h2>
          <dl className={styles.rules}>
            <div>
              <dt>대표가</dt>
              <dd>
                대장 단지 전용 84㎡형(83~86㎡)의 최근 90일 정상 거래 중위값이에요. 90일에 2건이 안 되면 180일, 그래도
                모자라면 365일로 넓혀요. 1년 동안 거래가 없으면 마지막 값을 그대로 두고 &ldquo;거래 없음&rdquo;을 표시해요.
              </dd>
            </div>
            <div>
              <dt>빼는 거래</dt>
              <dd>해제된 거래, 국토교통부 자료에서 사라진 거래, 직거래는 대표가 계산에서 빼요. 직거래에는 가족 간 저가 거래가 섞여 있어서예요.</dd>
            </div>
            <div>
              <dt>챌린저·그랜드마스터</dt>
              <dd>
                롤처럼 자리가 정해져 있어요. 챌린저는 1위 한 자리(50억 이상일 때), 그랜드마스터는 그다음 두 자리(35억
                이상일 때)예요. 값이 되어도 자리가 차 있으면 마스터에 머물러요.
              </dd>
            </div>
            <div>
              <dt>디비전과 LP</dt>
              <dd>
                아이언~다이아몬드는 가격 구간을 넷으로 나눠 IV → I 디비전을 매기고, 디비전 안에서 얼마나 올라왔는지를
                0~99 LP로 보여줘요. 마스터 이상은 디비전이 없고, 30억을 넘는 100만 원마다 1 LP예요.
              </dd>
            </div>
            <div>
              <dt>대장 단지</dt>
              <dd>지역마다 대장 단지 하나를 직접 골라 둬요. 순위는 그 단지들끼리의 순위예요.</dd>
            </div>
            <div>
              <dt>갱신과 시즌</dt>
              <dd>
                매일 아침과 오후, 실거래를 받아 순위를 다시 매겨요. 시즌 기록은 해마다 12월 말 티어이고, 올해 시즌은
                진행 중이에요.
              </dd>
            </div>
          </dl>
        </section>

        <section id="source" className={styles.section} aria-labelledby="source-title">
          <h2 id="source-title">출처와 한계</h2>
          <ul className={styles.notes}>
            <li>국토교통부 「아파트 매매 실거래가 상세 자료」(공공데이터포털)를 매일 두 번 받아요.</li>
            <li>실거래 신고 기한이 계약 후 30일이라, 최근 한 달 치는 날마다 채워져요. 오늘 순위는 내일 바뀔 수 있어요.</li>
            <li>투자 권유가 아니에요. 티어는 가격 구간의 이름일 뿐, 동네나 사는 사람의 등급이 아니에요.</li>
            <li>티어 이름은 리그 오브 레전드에서 빌렸어요. Riot Games와는 관계없는 서비스이고, 엠블럼은 새로 그렸어요.</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function rule(tier: Tier): string {
  const floor = tier.minManwon / EOK;
  if (tier.id === "challenger") return `1위 한 자리 · ${floor}억 이상일 때`;
  if (tier.id === "grandmaster") return `그다음 두 자리 · ${floor}억 이상일 때`;
  if (tier.id === "master") return `${floor}억 이상 · 디비전 없음`;
  const top = TIERS[tier.level - 1].minManwon / EOK;
  if (tier.id === "iron") return `${top}억 미만 · IV~I`;
  return `${floor}억 ~ ${top}억 · IV~I`;
}
