import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { CompareLines, SERIES_COLORS } from "@/components/charts/CompareLines";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { REGIONS } from "@/data/regions";
import { formatChange, formatPercent } from "@/lib/format/price";
import { formatLp, formatTier } from "@/lib/format/tier";
import { getLatestEdition, type EditionView } from "@/lib/queries";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
import { TIERS } from "@/lib/stats/tiers";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "단지 비교",
  description: "대장 단지 두세 곳의 티어와 84㎡ 대표가를 한 화면에서 맞대 봐요.",
};

const EOK = 10000;
const DEFAULT = ["jamsil", "dongtan"];
const MAX = 4;

export default async function ComparePage(props: PageProps<"/compare">) {
  const edition = await getLatestEdition();
  return (
    <>
      <TopBar current="compare" asOf={edition?.asOf} />
      <main className="page">
        <Suspense fallback={<p className={styles.loading}>불러오는 중…</p>}>
          <CompareBody searchParams={props.searchParams} edition={edition} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function CompareBody({
  searchParams,
  edition,
}: {
  searchParams: PageProps<"/compare">["searchParams"];
  edition: EditionView | null;
}) {
  const params = await searchParams;
  if (!edition) return <p className={styles.loading}>아직 매긴 순위가 없어요.</p>;

  const ranked = edition.snapshots.filter((s) => s.standing);
  const requested = String(params.r ?? "")
    .split(",")
    .filter((slug, i, all) => ranked.some((s) => s.regionSlug === slug) && all.indexOf(slug) === i)
    .slice(0, MAX);
  const selected = requested.length ? requested : DEFAULT;
  const picked = selected.map((slug) => ranked.find((s) => s.regionSlug === slug)!).filter(Boolean);
  const nameOf = (s: RegionSnapshot) => s.leader?.name ?? s.regionSlug;
  const regionOf = (s: RegionSnapshot) => REGIONS.find((r) => r.slug === s.regionSlug)!;

  const href = (slugs: string[]) => `/compare?r=${slugs.join(",")}`;
  const toggle = (slug: string) => {
    if (selected.includes(slug)) return selected.length > 1 ? selected.filter((s) => s !== slug) : selected;
    return selected.length < MAX ? [...selected, slug] : [...selected.slice(1), slug];
  };

  const [a, b] = picked;
  const gap = a && b ? a.rep!.priceManwon - b.rep!.priceManwon : null;
  const yearAgo = (s: RegionSnapshot) => s.history.at(-13)?.priceManwon ?? null;
  const gapYearAgo = a && b && yearAgo(a) !== null && yearAgo(b) !== null ? yearAgo(a)! - yearAgo(b)! : null;
  const ratio = a && b ? a.rep!.priceManwon / b.rep!.priceManwon : null;

  return (
    <>
      <header className={styles.head}>
        <h1>단지 비교</h1>
        <p>최대 {MAX}곳 · 아래에서 단지를 누르면 더하고, 다시 누르면 빼요</p>
      </header>

      {a && b && (
        <section className={styles.versus} aria-label="맞대결">
          <Side snap={a} name={nameOf(a)} area={regionOf(a).name} color={SERIES_COLORS[0]} />
          <div className={styles.vs}>
            <span className={styles.vsMark}>VS</span>
            {gap !== null && (
              <p className={styles.gap}>
                격차 <b className="num">{(Math.abs(gap) / EOK).toFixed(2)}억</b>
                {gapYearAgo !== null && (
                  <span>
                    1년 전보다 {formatChange(Math.abs(gap) - Math.abs(gapYearAgo)).text}{" "}
                    {Math.abs(gap) >= Math.abs(gapYearAgo) ? "벌어졌어요" : "좁혀졌어요"}
                  </span>
                )}
                {ratio && ratio >= 1 && (
                  <span>
                    {regionOf(a).name} 한 채 = {regionOf(b).name} <b className="num">{ratio.toFixed(1)}</b>채
                  </span>
                )}
              </p>
            )}
          </div>
          <Side snap={b} name={nameOf(b)} area={regionOf(b).name} color={SERIES_COLORS[1]} right />
        </section>
      )}

      <section className={styles.card} aria-labelledby="chart-title">
        <header className={styles.cardHead}>
          <h2 id="chart-title">월말 대표가</h2>
          <p>2021년부터 · 뒤 배경은 티어 구간</p>
        </header>
        <ul className={styles.legend}>
          {picked.map((s, i) => (
            <li key={s.regionSlug}>
              <i style={{ background: SERIES_COLORS[i] }} />
              {nameOf(s)}
            </li>
          ))}
        </ul>
        {(["wide", "narrow"] as const).map((variant) => (
          <div key={variant} className={`${variant}-only`}>
            <CompareLines
              variant={variant}
              series={picked.map((s) => ({ slug: s.regionSlug, name: regionOf(s).name, points: s.history }))}
            />
          </div>
        ))}
      </section>

      <section className={styles.card} aria-labelledby="table-title">
        <h2 id="table-title" className="visually-hidden">
          비교표
        </h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">단지</th>
              <th scope="col">티어</th>
              <th scope="col" className={styles.right}>
                84㎡ 대표가
              </th>
              <th scope="col" className={styles.right}>
                3개월
              </th>
              <th scope="col" className={styles.right}>
                2021–22 고점 대비
              </th>
            </tr>
          </thead>
          <tbody>
            {picked.map((s, i) => {
              const change = s.change3m ? formatChange(s.change3m.diff) : null;
              return (
                <tr key={s.regionSlug}>
                  <td>
                    <span className={styles.swatch} style={{ background: SERIES_COLORS[i] }} aria-hidden="true" />
                    <Link href={`/r/${s.regionSlug}`} className={styles.name}>
                      {nameOf(s)}
                    </Link>
                    <span className={styles.area}>{regionOf(s).area}</span>
                  </td>
                  <td>
                    <span className={styles.tier}>
                      <TierEmblem tier={s.standing!.tier.id} size={26} />
                      {formatTier(s.standing!)}
                    </span>
                  </td>
                  <td className={`${styles.right} num ${styles.big}`}>{(s.rep!.priceManwon / EOK).toFixed(2)}억</td>
                  <td className={`${styles.right} ${change?.direction ?? "flat"}`}>
                    <span className="num">{change ? `${change.arrow} ${change.text}` : "—"}</span>
                  </td>
                  <td className={`${styles.right} ${s.vsPeak === null ? "flat" : s.vsPeak >= 0 ? "up" : "down"}`}>
                    <span className="num">{s.vsPeak === null ? "—" : formatPercent(s.vsPeak)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={styles.card} aria-labelledby="picker-title">
        <h2 id="picker-title" className={styles.pickerTitle}>
          단지 고르기
        </h2>
        {TIERS.map((tier) => {
          const inTier = ranked.filter((s) => s.standing!.tier.id === tier.id).sort((x, y) => x.standing!.rank - y.standing!.rank);
          if (!inTier.length) return null;
          return (
            <div key={tier.id} className={styles.pickRow} style={{ "--c": `var(--t-${tier.id})` } as CSSProperties}>
              <span className={styles.pickTier}>
                <TierEmblem tier={tier.id} size={24} />
                {tier.name}
              </span>
              <ul>
                {inTier.map((s) => {
                  const on = selected.indexOf(s.regionSlug);
                  return (
                    <li key={s.regionSlug}>
                      <Link
                        href={href(toggle(s.regionSlug))}
                        className={`${styles.pick} ${on >= 0 ? styles.on : ""}`}
                        style={on >= 0 ? ({ "--s": SERIES_COLORS[on] } as CSSProperties) : undefined}
                        aria-pressed={on >= 0}
                        scroll={false}
                      >
                        {regionOf(s).name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Side({ snap, name, area, color, right }: { snap: RegionSnapshot; name: string; area: string; color: string; right?: boolean }) {
  const st = snap.standing!;
  return (
    <div className={`${styles.side} ${right ? styles.sideRight : ""}`} style={{ "--c": `var(--t-${st.tier.id})`, "--s": color } as CSSProperties}>
      <TierEmblem tier={st.tier.id} size={96} className={styles.sideCrest} />
      <div>
        <p className={styles.sideArea}>{area}</p>
        <p className={styles.sideName}>{name}</p>
        <p className={styles.sideTier}>
          {formatTier(st)} · <span className="num">{formatLp(st)}</span> · <span className="num">#{st.rank}</span>
        </p>
        <p className={styles.sidePrice}>
          <span className="num">{(snap.rep!.priceManwon / EOK).toFixed(2)}</span>억
        </p>
      </div>
    </div>
  );
}
