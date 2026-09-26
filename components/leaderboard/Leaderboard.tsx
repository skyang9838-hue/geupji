import Link from "next/link";
import type { CSSProperties } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import type { RegionDef } from "@/data/regions";
import { formatChange, formatPercent } from "@/lib/format/price";
import { formatLp, formatTier } from "@/lib/format/tier";
import type { EditionEvent } from "@/lib/stats/events";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
import styles from "./Leaderboard.module.css";

const EOK = 10000;

/** Every ranked region in one table, the way a ranked ladder is read. */
export function Leaderboard({
  snapshots,
  regions,
  events,
}: {
  snapshots: RegionSnapshot[];
  regions: RegionDef[];
  events: EditionEvent[];
}) {
  const bySlug = new Map(regions.map((r) => [r.slug, r]));
  const ranked = snapshots.filter((s) => s.standing).sort((a, b) => a.standing!.rank - b.standing!.rank);
  const moved = new Map(
    events.flatMap((e) => (e.type === "TIER_UP" || e.type === "TIER_DOWN" ? [[e.regionSlug, e.type] as const] : [])),
  );
  const highs = new Set(events.filter((e) => e.type === "NEW_HIGH").map((e) => e.regionSlug));

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.rankCol}>
              #
            </th>
            <th scope="col">단지</th>
            <th scope="col" className={styles.tierCol}>
              티어
            </th>
            <th scope="col" className={styles.right}>
              84㎡ 대표가
            </th>
            <th scope="col" className={`${styles.right} ${styles.changeCol}`}>
              3개월
            </th>
            <th scope="col" className={`${styles.right} ${styles.opt}`}>
              전고점 대비
            </th>
            <th scope="col" className={styles.opt}>
              최근 1년
            </th>
            <th scope="col" className={`${styles.right} ${styles.opt}`}>
              최근 거래
            </th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => {
            const region = bySlug.get(s.regionSlug)!;
            const st = s.standing!;
            const change = s.change3m ? formatChange(s.change3m.diff) : null;
            const lastMonth = s.ladder.at(-2)?.rank ?? null;
            const rankMove = lastMonth === null ? 0 : lastMonth - st.rank;
            const tierMove = moved.get(s.regionSlug);
            return (
              <tr key={s.regionSlug} style={{ "--c": `var(--t-${st.tier.id})` } as CSSProperties}>
                <td className={styles.rankCol}>
                  <span className={`${styles.rank} num`}>{st.rank}</span>
                  {rankMove !== 0 && (
                    <span className={`${styles.rankMove} num ${rankMove > 0 ? "up" : "down"}`}>
                      {rankMove > 0 ? `▲${rankMove}` : `▼${-rankMove}`}
                    </span>
                  )}
                </td>
                <td>
                  <Link href={`/r/${region.slug}`} className={styles.name}>
                    {s.leader?.name}
                  </Link>
                  <span className={styles.area}>
                    {region.name} · {region.area}
                  </span>
                  <span className={styles.mTier}>
                    <TierEmblem tier={st.tier.id} size={18} />
                    {formatTier(st)} · <span className="num">{formatLp(st)}</span>
                    {tierMove && (
                      <span className={`${styles.badge} ${tierMove === "TIER_UP" ? styles.promo : styles.demo}`}>
                        {tierMove === "TIER_UP" ? "승급" : "강등"}
                      </span>
                    )}
                  </span>
                </td>
                <td className={styles.tierCol}>
                  <span className={styles.tier}>
                    <TierEmblem tier={st.tier.id} size={34} />
                    <span>
                      <span className={styles.tierName}>
                        {formatTier(st)}
                        {tierMove && (
                          <span className={`${styles.badge} ${tierMove === "TIER_UP" ? styles.promo : styles.demo}`}>
                            {tierMove === "TIER_UP" ? "승급" : "강등"}
                          </span>
                        )}
                      </span>
                      <span className={`${styles.lp} num`}>{formatLp(st)}</span>
                    </span>
                  </span>
                </td>
                <td className={styles.right}>
                  <span className={styles.price}>
                    <span className="num">{(s.rep!.priceManwon / EOK).toFixed(2)}</span>억
                  </span>
                  <span className={styles.sub}>
                    {highs.has(s.regionSlug) && <span className={`${styles.badge} ${styles.high}`}>신고가</span>}
                    {s.rep!.stale ? "1년 넘게 거래 없음" : `${s.rep!.windowDays}일 · ${s.rep!.count}건`}
                  </span>
                </td>
                <td className={`${styles.right} ${styles.changeCol} ${change ? change.direction : "flat"}`}>
                  {change ? (
                    <span className="num">
                      {change.arrow} {change.text}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${styles.right} ${styles.opt} ${s.vsPeak === null ? "flat" : s.vsPeak >= 0 ? "up" : "down"}`}>
                  {s.vsPeak === null ? "—" : <span className="num">{formatPercent(s.vsPeak)}</span>}
                </td>
                <td className={styles.opt}>
                  <Sparkline values={s.history.slice(-13).map((h) => h.priceManwon)} />
                </td>
                <td className={`${styles.right} ${styles.opt} ${styles.date}`}>
                  <span className="num">{s.rep!.lastDealDate.slice(5).replace("-", ".").replace(/^0/, "")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
