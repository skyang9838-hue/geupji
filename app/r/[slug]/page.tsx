import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { TierGraph, type GraphTrade } from "@/components/charts/TierGraph";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { REGIONS, regionBySlug } from "@/data/regions";
import { formatKoreanDate } from "@/lib/format/date";
import { formatChange, formatEok, formatKoreanPrice, formatPercent } from "@/lib/format/price";
import { formatClimb, formatLp, formatTier, romanDivision } from "@/lib/format/tier";
import { getComplexTrades, getLatestEdition } from "@/lib/queries";
import { BASE_BAND, isQualifying } from "@/lib/stats/representative";
import { TIERS } from "@/lib/stats/tiers";
import styles from "./page.module.css";

const EOK = 10000;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) return {};
  const edition = await getLatestEdition();
  const snap = edition?.snapshots.find((s) => s.regionSlug === slug);
  const name = snap?.leader?.name ?? region.name;
  const tier = snap?.standing ? formatTier(snap.standing) : null;
  return {
    title: tier ? `${name} · ${tier}` : name,
    description: `${region.name} 대장 ${name} 전용 84㎡ 대표가${snap?.rep ? ` ${formatEok(snap.rep.priceManwon, { decimals: 2 })}` : ""}${tier ? ` · ${tier}` : ""}`,
  };
}

export default async function ApartmentPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) notFound();

  const edition = await getLatestEdition();
  const snap = edition?.snapshots.find((s) => s.regionSlug === slug);
  const st = snap?.standing;
  if (!edition || !snap || !st || !snap.rep || !snap.leader) {
    return (
      <>
        <TopBar asOf={edition?.asOf} />
        <main className={`page ${styles.missing}`}>
          <h1>{region.name}</h1>
          <p>아직 이 지역의 84㎡ 실거래가 없어서 티어를 매기지 못했어요.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const band = region.band ?? BASE_BAND;
  const trades = await getComplexTrades(snap.leader.aptSeq);
  const graphTrades: GraphTrade[] = trades
    .filter((t) => t.dealDate >= "2021-01-01" && isQualifying(t, band))
    .map((t) => ({ dealDate: t.dealDate, priceManwon: t.priceManwon }));
  const recent = trades.filter((t) => !t.removed).slice(-12).reverse();
  const points = snap.history.map((h, i) => ({ ...h, level: snap.ladder[i]?.level ?? null }));

  const total = edition.snapshots.filter((s) => s.standing).length;
  const change = snap.change3m ? formatChange(snap.change3m.diff) : null;
  const climb = formatClimb(st);
  const lastMonth = snap.ladder.at(-2)?.rank ?? null;
  const rankMove = lastMonth === null ? null : lastMonth - st.rank;
  const neighbors = edition.snapshots
    .filter((s) => s.standing?.tier.id === st.tier.id && s.regionSlug !== slug)
    .sort((a, b) => a.standing!.rank - b.standing!.rank);

  return (
    <>
      <TopBar asOf={edition.asOf} />
      <main className="page" style={{ "--c": `var(--t-${st.tier.id})` } as CSSProperties}>
        <header className={styles.profile}>
          <TierEmblem tier={st.tier.id} size={140} className={styles.crest} label={formatTier(st)} />
          <div className={styles.who}>
            <p className={styles.crumbs}>
              <Link href="/">랭킹</Link> <span aria-hidden="true">›</span> {region.name}
            </p>
            <h1 className={styles.name}>{snap.leader.name}</h1>
            <p className={styles.meta}>
              {region.name} · {region.area}
              {snap.leader.buildYear ? ` · ${snap.leader.buildYear}년 준공` : ""}
            </p>
            <p className={styles.chips}>
              <span className={styles.rankChip}>
                <span className="num">#{st.rank}</span> / {total}곳
              </span>
              <span className={styles.tierChip}>
                {formatTier(st)} · <span className="num">{formatLp(st)}</span>
              </span>
            </p>
          </div>
          <div className={styles.figure}>
            <p className={styles.figureLabel}>84㎡ 대표가</p>
            <p className={styles.figureValue}>
              <span className="num">{(snap.rep.priceManwon / EOK).toFixed(2)}</span>억
            </p>
            <p className={styles.figureNote}>
              {snap.rep.stale
                ? `1년 넘게 거래 없음 · 마지막 ${formatKoreanDate(snap.rep.lastDealDate)}`
                : `최근 ${snap.rep.windowDays}일 실거래 ${snap.rep.count}건의 중위값`}
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          <aside className={styles.side}>
            <section className={styles.card} aria-labelledby="rank-title">
              <h2 id="rank-title" className={styles.cardTitle}>
                랭크
              </h2>
              <div className={styles.rankRow}>
                <TierEmblem tier={st.tier.id} size={76} />
                <div>
                  <p className={styles.rankTier}>{formatTier(st)}</p>
                  <p className={`${styles.rankLp} num`}>{formatLp(st)}</p>
                </div>
              </div>
              {st.division !== null && (
                <div className={styles.lpBar} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={st.lp} aria-label="디비전 진행도">
                  <span style={{ width: `${Math.max(st.lp, 2)}%` }} />
                </div>
              )}
              <p className={styles.climb}>{climb ?? "맨 꼭대기예요. 더 오를 자리가 없어요"}</p>
              <dl className={styles.stats}>
                <div>
                  <dt>3개월</dt>
                  <dd className={change?.direction ?? "flat"}>
                    <span className="num">{change ? `${change.arrow} ${change.text}` : "—"}</span>
                  </dd>
                </div>
                <div>
                  <dt>지난달 순위</dt>
                  <dd className={!rankMove ? "flat" : rankMove > 0 ? "up" : "down"}>
                    <span className="num">
                      {lastMonth === null ? "—" : !rankMove ? `${lastMonth}위 그대로` : `${lastMonth}위 → ${rankMove > 0 ? "▲" : "▼"}${Math.abs(rankMove)}`}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>2021–22 고점 대비</dt>
                  <dd className={snap.vsPeak === null ? "flat" : snap.vsPeak >= 0 ? "up" : "down"}>
                    <span className="num">{snap.vsPeak === null ? "—" : formatPercent(snap.vsPeak)}</span>
                  </dd>
                </div>
                <div>
                  <dt>최고 거래</dt>
                  <dd>
                    <span className="num">{snap.high ? formatEok(snap.high.priceManwon, { decimals: 2 }) : "—"}</span>
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.card} aria-labelledby="season-title">
              <h2 id="season-title" className={styles.cardTitle}>
                시즌 기록 <span>해마다 12월 말 티어</span>
              </h2>
              <table className={styles.seasons}>
                <tbody>
                  {[...snap.seasons].reverse().map((season, i) => {
                    const tier = TIERS[season.level];
                    return (
                      <tr key={season.year}>
                        <th scope="row">
                          <span className="num">S{season.year}</span>
                          {i === 0 && <span className={styles.live}>진행 중</span>}
                        </th>
                        <td>
                          <span className={styles.seasonTier}>
                            <TierEmblem tier={tier.id} size={26} />
                            {tier.name}
                            {season.division ? ` ${romanDivision(season.division)}` : ""}
                          </span>
                        </td>
                        <td className={`${styles.right} num`}>{(season.priceManwon / EOK).toFixed(2)}억</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {neighbors.length > 0 && (
              <nav className={styles.card} aria-labelledby="neighbors-title">
                <h2 id="neighbors-title" className={styles.cardTitle}>
                  같은 {st.tier.name}
                </h2>
                <ul className={styles.neighbors}>
                  {neighbors.map((s) => (
                    <li key={s.regionSlug}>
                      <Link href={`/r/${s.regionSlug}`}>
                        <span className={`${styles.nRank} num`}>{s.standing!.rank}</span>
                        <b>{s.leader?.name}</b>
                        <span className="num">{(s.rep!.priceManwon / EOK).toFixed(2)}억</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </aside>

          <div className={styles.mainCol}>
            <section className={styles.card} aria-labelledby="graph-title">
              <header className={styles.cardHead}>
                <h2 id="graph-title" className={styles.cardTitle}>
                  티어 그래프
                </h2>
                <p>선은 월말 대표가, 점 하나가 대표가에 들어간 84㎡ 실거래 한 건</p>
              </header>
              {(["wide", "narrow"] as const).map((variant) => (
                <div key={variant} className={`${variant}-only`}>
                  <TierGraph points={points} trades={graphTrades} variant={variant} />
                </div>
              ))}
            </section>

            <section className={styles.card} aria-labelledby="trades-title">
              <header className={styles.cardHead}>
                <h2 id="trades-title" className={styles.cardTitle}>
                  최근 거래
                </h2>
                <p>모든 면적 · 해제된 거래는 줄을 그어 둬요</p>
              </header>
              <table className={styles.trades}>
                <thead>
                  <tr>
                    <th scope="col">계약일</th>
                    <th scope="col">전용</th>
                    <th scope="col">층</th>
                    <th scope="col" className={styles.right}>
                      거래가
                    </th>
                    <th scope="col">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t, i) => (
                    <tr key={i} className={t.cancelled ? styles.cancelled : undefined}>
                      <td className="num">{t.dealDate.slice(2).replaceAll("-", ".")}</td>
                      <td className="num">{Math.floor(t.areaM2)}㎡</td>
                      <td className="num">{t.floor}층</td>
                      <td className={styles.right}>
                        {t.cancelled ? <s>{formatKoreanPrice(t.priceManwon)}</s> : formatKoreanPrice(t.priceManwon)}
                      </td>
                      <td className={styles.note}>
                        {t.cancelled ? "해제" : t.dealingType === "직거래" ? "직거래" : t.registeredOn ? "등기" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
