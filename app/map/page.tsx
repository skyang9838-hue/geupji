import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { MapView } from "@/components/map/MapView";
import type { MapJump, MapRegion } from "@/components/map/types";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { areaLabel, REGIONS } from "@/data/regions";
import { formatKoreanDate } from "@/lib/format/date";
import { formatGeupji, formatTier } from "@/lib/format/tier";
import { getLatestEdition } from "@/lib/queries";
import { TIERS } from "@/lib/stats/tiers";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "급지 지도",
  description: "대장아파트 51곳을 오늘 티어 색으로 칠한 지도. 수도권과 대전·대구 수성·부산 해운대.",
};

const EOK = 10000;

export default async function MapPage() {
  const edition = await getLatestEdition();
  const bySlug = new Map((edition?.snapshots ?? []).map((s) => [s.regionSlug, s]));

  const regions: MapRegion[] = REGIONS.map((r) => {
    const s = bySlug.get(r.slug);
    const st = s?.standing ?? null;
    return {
      slug: r.slug,
      name: r.name,
      area: areaLabel(r),
      sido: r.sido,
      tier: st?.tier.id ?? null,
      tierLabel: st ? formatTier(st) : null,
      geupji: st ? formatGeupji(st) : null,
      rank: st?.rank ?? null,
      priceEok: s?.rep ? (s.rep.priceManwon / EOK).toFixed(2) : null,
      leaderName: s?.leader?.name ?? null,
    };
  });

  const capital = REGIONS.filter((r) => ["서울", "경기", "인천"].includes(r.sido)).map((r) => r.slug);
  const jumps: MapJump[] = [
    { key: "capital", label: "수도권", slugs: capital },
    { key: "seoul", label: "서울", slugs: REGIONS.filter((r) => r.sido === "서울").map((r) => r.slug) },
    { key: "daejeon", label: "대전", slugs: ["daejeon"] },
    { key: "suseong", label: "대구 수성", slugs: ["suseong"] },
    { key: "haeundae", label: "부산 해운대", slugs: ["haeundae"] },
  ];

  const counts = new Map<string, number>();
  for (const r of regions) if (r.tier) counts.set(r.tier, (counts.get(r.tier) ?? 0) + 1);

  return (
    <>
      <TopBar current="map" asOf={edition?.asOf} />
      <main className="page">
        <header className={styles.head}>
          <h1 className={styles.title}>급지 지도</h1>
          <p className={styles.lede}>
            대장아파트 {REGIONS.length}곳을 오늘 티어 색으로 칠했어요.
            {edition ? ` ${formatKoreanDate(edition.asOf)} 실거래 기준.` : ""} 지역을 누르면 대장 단지와 대표가가 나와요.
          </p>
        </header>

        <MapView regions={regions} jumps={jumps} />

        <section className={styles.legendWrap} aria-labelledby="legend-title">
          <h2 id="legend-title" className={styles.legendTitle}>
            범례
          </h2>
          <ul className={styles.legend}>
            {TIERS.map((t) => (
              <li key={t.id} style={{ "--c": `var(--t-${t.id})` } as CSSProperties}>
                <span className={styles.swatch} aria-hidden />
                <TierEmblem tier={t.id} size={26} />
                <span className={styles.tierName}>{t.name}</span>
                <span className={`${styles.count} num`}>{counts.get(t.id) ?? 0}곳</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            지역 경계는 행정동을 묶어 그린 근사치예요 (지역은 법정동으로 정의돼 있어 조금 다를 수 있어요). 경계: 통계청
            SGIS 행정동 경계(공공누리 제1유형), 가공{" "}
            <a href="https://github.com/vuski/admdongkor" rel="noreferrer" target="_blank">
              vuski/admdongkor
            </a>{" "}
            (CC BY 4.0). 지도: © OpenStreetMap 기여자 (ODbL).
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
