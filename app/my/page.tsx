import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import { SavedList, SaveStar } from "@/components/my/SavedApts";
import { SiteFooter } from "@/components/site/SiteFooter";
import { TopBar } from "@/components/site/TopBar";
import { REGIONS, isChallengerRegion, regionBySlug } from "@/data/regions";
import { formatKoreanDate } from "@/lib/format/date";
import { formatClimb, formatGeupji, formatTier } from "@/lib/format/tier";
import { getComplex, getComplexTrades, getLatestEdition, searchComplexes, type EditionView } from "@/lib/queries";
import { placeAmong } from "@/lib/stats/lookup";
import { representativePrice } from "@/lib/stats/representative";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "내 아파트 티어",
  description: "단지 이름을 넣으면 오늘 대장아파트 티어표에서 몇 급지, 어느 티어쯤인지 알려 줘요.",
};

const EOK = 10000;

/** 시군구 code → 시도, by its first two digits (a code can outlive the region that fetched it). */
const SIDO_PREFIX: Record<string, string> = { "11": "서울", "41": "경기", "28": "인천", "30": "대전", "27": "대구", "26": "부산" };
const SIDO = { get: (sggCd: string) => SIDO_PREFIX[sggCd.slice(0, 2)] };

export default async function MyPage(props: PageProps<"/my">) {
  const edition = await getLatestEdition();
  return (
    <>
      <TopBar current="my" asOf={edition?.asOf} />
      <main className="page">
        <Suspense fallback={<p className={styles.loading}>불러오는 중…</p>}>
          <MyBody searchParams={props.searchParams} edition={edition} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function MyBody({
  searchParams,
  edition,
}: {
  searchParams: PageProps<"/my">["searchParams"];
  edition: EditionView | null;
}) {
  const params = await searchParams;
  const q = String(params.q ?? "").trim().slice(0, 40);
  const apt = String(params.apt ?? "").trim();
  if (!edition) return <p className={styles.loading}>아직 매긴 순위가 없어요.</p>;

  const hits = q ? await searchComplexes(q, edition.asOf) : [];

  return (
    <>
      <header className={styles.head}>
        <h1>내 아파트 티어</h1>
        <p>
          단지 이름을 넣으면 오늘 티어표에서 몇 급지, 어느 티어쯤인지 알려 줘요. 전용 84㎡ 실거래 기준 · 급지.gg가
          모으는 {REGIONS.length}개 지역 안의 단지만 찾을 수 있어요.
        </p>
        <form action="/my" className={styles.search} role="search">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="단지 이름 (예: 포레나, 래미안)"
            aria-label="단지 이름"
            minLength={2}
            required
          />
          <button type="submit">찾기</button>
        </form>
        <SavedList current={apt || undefined} />
      </header>

      {apt && <Result aptSeq={apt} edition={edition} />}

      {q && (
        <section className={styles.hits} aria-labelledby="hits-title">
          <h2 id="hits-title">
            “{q}” 검색 결과 <span className="num">{hits.length}</span>
          </h2>
          {hits.length ? (
            <ul>
              {hits.map((h) => (
                <li key={h.aptSeq}>
                  <Link href={`/my?apt=${encodeURIComponent(h.aptSeq)}&q=${encodeURIComponent(q)}`} aria-current={h.aptSeq === apt ? "page" : undefined}>
                    <span className={styles.hitName}>{h.name}</span>
                    <span className={styles.hitMeta}>
                      {SIDO.get(h.sggCd) ?? ""} {h.umdName}
                      {h.buildYear ? ` · ${h.buildYear}년` : ""} · 최근 1년 거래 <span className="num">{h.recent}</span>건
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>찾는 단지가 없어요. 이름을 짧게 넣거나, 급지.gg가 모으는 지역인지 확인해 주세요.</p>
          )}
        </section>
      )}
    </>
  );
}

async function Result({ aptSeq, edition }: { aptSeq: string; edition: EditionView }) {
  const complex = await getComplex(aptSeq);
  if (!complex) return <p className={styles.none}>이 단지를 찾지 못했어요.</p>;

  const trades = await getComplexTrades(aptSeq);
  const rep = representativePrice(trades, edition.asOf);
  const where = `${SIDO.get(complex.sggCd) ?? ""} ${complex.umdName}${complex.buildYear ? ` · ${complex.buildYear}년 준공` : ""}`;

  if (!rep) {
    return (
      <section className={styles.result}>
        <div className={styles.resultHead}>
          <div>
            <h2 className={styles.aptName}>{complex.name}</h2>
            <p className={styles.where}>{where}</p>
          </div>
          <SaveStar apt={{ aptSeq, name: complex.name }} />
        </div>
        <p className={styles.none}>전용 84㎡ 실거래가 없어서 티어를 매길 수 없어요.</p>
      </section>
    );
  }

  const ranked = edition.snapshots.filter((s) => s.rep && s.standing);
  const ladder = ranked.map((s) => {
    const region = regionBySlug(s.regionSlug);
    return {
      key: s.regionSlug,
      priceManwon: s.rep!.priceManwon,
      anchor: region?.sido === "서울",
      challenger: region ? isChallengerRegion(region) : false,
    };
  });
  const placed = placeAmong(ladder, rep.priceManwon);
  if (!placed) return null;
  const st = placed.standing;
  const climb = formatClimb(st);
  const neighbor = (slug: string | null) => (slug ? ranked.find((s) => s.regionSlug === slug) ?? null : null);

  return (
    <section className={styles.result} style={{ "--c": `var(--t-${st.tier.id})` } as CSSProperties}>
      <div className={styles.resultHead}>
        <div>
          <h2 className={styles.aptName}>{complex.name}</h2>
          <p className={styles.where}>{where}</p>
        </div>
        <SaveStar apt={{ aptSeq, name: complex.name }} />
      </div>

      <div className={styles.rank}>
        <TierEmblem tier={st.tier.id} size={132} className={styles.crest} />
        <div>
          <p className={styles.tierName}>{formatTier(st)}</p>
          <p className={styles.geupji}>
            <span className="num">{formatGeupji(st)}</span> · 대장 단지 사이에 넣으면{" "}
            <b className="num">{st.rank}</b>위 / {ranked.length + 1}
          </p>
          {climb && <p className={styles.climb}>{climb}</p>}
        </div>
        <dl className={styles.figure}>
          <dt>84㎡ 대표가</dt>
          <dd>
            <span className="num">{(rep.priceManwon / EOK).toFixed(2)}</span>억
          </dd>
          <dd className={styles.basis}>
            {rep.stale
              ? `1년 넘게 거래가 없어 마지막 거래 ${formatKoreanDate(rep.lastDealDate)}로 봤어요`
              : `최근 ${rep.windowDays}일 거래 ${rep.count}건의 중위값`}
          </dd>
        </dl>
      </div>

      <div className={styles.neighbors}>
        <Neighbor label="바로 위" snap={neighbor(placed.above)} />
        <Neighbor label="바로 아래" snap={neighbor(placed.below)} />
      </div>
    </section>
  );
}

function Neighbor({ label, snap }: { label: string; snap: EditionView["snapshots"][number] | null }) {
  if (!snap) {
    return (
      <div className={styles.neighbor}>
        <span className={styles.nLabel}>{label}</span>
        <span className={styles.nName}>없음</span>
      </div>
    );
  }
  const region = regionBySlug(snap.regionSlug)!;
  return (
    <Link href={`/r/${region.slug}`} className={styles.neighbor} style={{ "--c": `var(--t-${snap.standing!.tier.id})` } as CSSProperties}>
      <span className={styles.nLabel}>{label}</span>
      <span className={styles.nName}>
        <TierEmblem tier={snap.standing!.tier.id} size={26} /> {region.name}
      </span>
      <span className={styles.nMeta}>
        {snap.leader?.name} · <span className="num">{(snap.rep!.priceManwon / EOK).toFixed(2)}</span>억
      </span>
    </Link>
  );
}
