import Link from "next/link";
import type { CSSProperties } from "react";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import type { RegionDef } from "@/data/regions";
import { formatChange } from "@/lib/format/price";
import { formatLp, romanDivision } from "@/lib/format/tier";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
import { TIERS, type Tier } from "@/lib/stats/tiers";
import styles from "./TierBoard.module.css";

const EOK = 10000;

/** The ladder as a tier list: one row per tier, the regions that hold it, best first. */
export function TierBoard({ snapshots, regions }: { snapshots: RegionSnapshot[]; regions: RegionDef[] }) {
  const bySlug = new Map(regions.map((r) => [r.slug, r]));
  const ranked = snapshots.filter((s) => s.standing).sort((a, b) => a.standing!.rank - b.standing!.rank);

  return (
    <ol className={styles.board} aria-label="티어별 대장 단지">
      {TIERS.map((tier, i) => {
        const members = ranked.filter((s) => s.standing!.tier.id === tier.id);
        return (
          <li
            key={tier.id}
            className={`${styles.row} ${tier.id === "challenger" ? styles.throne : ""} ${members.length ? "" : styles.empty}`}
            style={{ "--c": `var(--t-${tier.id})`, "--i": i } as CSSProperties}
          >
            <div className={styles.label}>
              <TierEmblem tier={tier.id} size={tier.id === "challenger" ? 64 : 52} className={styles.emblem} />
              <div>
                <p className={styles.tierName}>{tier.name}</p>
                <p className={styles.rule}>{rule(tier)}</p>
              </div>
            </div>
            {members.length ? (
              <ul className={styles.members}>
                {members.map((s) => {
                  const region = bySlug.get(s.regionSlug)!;
                  const st = s.standing!;
                  const change = s.change3m ? formatChange(s.change3m.diff) : null;
                  return (
                    <li key={s.regionSlug}>
                      <Link href={`/r/${region.slug}`} className={styles.chip}>
                        <span className={`${styles.rank} num`}>{st.rank}</span>
                        <span className={styles.name}>{s.leader?.name ?? region.name}</span>
                        <span className={`${styles.step} num`}>{st.division ? romanDivision(st.division) : formatLp(st)}</span>
                        <span className={styles.area}>
                          {region.name} · {region.area}
                        </span>
                        <span className={styles.price}>
                          <span className="num">{(s.rep!.priceManwon / EOK).toFixed(2)}</span>억
                        </span>
                        {tier.id === "challenger" && change && (
                          <span className={`${styles.change} ${styles[change.direction]}`}>
                            3개월 {change.arrow} {change.text}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.none}>이 티어는 비어 있어요</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function rule(tier: Tier): string {
  const floor = `${tier.minManwon / EOK}억`;
  if (tier.seats) return `${tier.seats}자리 · ${floor} 이상`;
  if (tier.id === "iron") return `${TIERS[tier.level - 1].minManwon / EOK}억 미만`;
  if (tier.id === "master") return `${floor} 이상`;
  return `${floor} ~ ${TIERS[tier.level - 1].minManwon / EOK}억`;
}
