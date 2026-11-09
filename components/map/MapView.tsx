"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { TierEmblem } from "@/components/emblem/TierEmblem";
import type { MapJump, MapRegion } from "./types";
import styles from "./MapView.module.css";

// Leaflet은 window가 있어야 돌아서 서버에서 그리지 않는다.
const RegionMap = dynamic(() => import("./RegionMap"), {
  ssr: false,
  loading: () => <div className={styles.loading}>지도를 불러오는 중…</div>,
});

export function MapView({ regions, jumps }: { regions: MapRegion[]; jumps: MapJump[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [jump, setJump] = useState<{ key: string; n: number }>({ key: jumps[0].key, n: 0 });

  const shown = regions.find((r) => r.slug === (hovered ?? selected)) ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.mapCol}>
        <div className={styles.jumps} role="group" aria-label="지역 바로가기">
          {jumps.map((j) => (
            <button
              key={j.key}
              type="button"
              aria-pressed={jump.key === j.key}
              onClick={() => setJump((p) => ({ key: j.key, n: p.n + 1 }))}
            >
              {j.label}
            </button>
          ))}
        </div>
        <div className={styles.map}>
          <RegionMap
            regions={regions}
            jumps={jumps}
            jump={jump}
            selected={selected}
            onSelect={setSelected}
            onHover={setHovered}
          />
        </div>
      </div>

      <aside className={styles.card} aria-live="polite">
        {shown ? (
          <RegionCard region={shown} />
        ) : (
          <p className={styles.hint}>지역을 누르거나 가리키면 여기에 티어와 대장 단지가 나와요.</p>
        )}
      </aside>
    </div>
  );
}

function RegionCard({ region }: { region: MapRegion }) {
  return (
    <div
      className={styles.cardBody}
      style={{ "--c": region.tier ? `var(--t-${region.tier})` : "var(--text-3)" } as CSSProperties}
    >
      <div className={styles.cardHead}>
        {region.tier && <TierEmblem tier={region.tier} size={64} />}
        <div>
          <p className={styles.area}>{region.area}</p>
          <h2 className={styles.name}>{region.name}</h2>
        </div>
      </div>
      {region.tier ? (
        <>
          <p className={styles.tier}>
            <span className={styles.tierName}>{region.tierLabel}</span>
            <span className="num">{region.geupji}</span>
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>순위</dt>
              <dd className="num">{region.rank}위</dd>
            </div>
            <div>
              <dt>84㎡ 대표가</dt>
              <dd>
                <span className="num">{region.priceEok}</span>억
              </dd>
            </div>
            <div className={styles.wide}>
              <dt>대장 단지</dt>
              <dd>{region.leaderName ?? "—"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className={styles.tier}>오늘 판에 대표가가 없어 티어가 없어요.</p>
      )}
      <Link href={`/r/${region.slug}`} className={styles.link}>
        단지 페이지 보기 →
      </Link>
    </div>
  );
}
