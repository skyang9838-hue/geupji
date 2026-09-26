"use client";

import { useState } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { TIER_COLOR } from "@/lib/emblem/colors";
import { TIERS, type TierLevel } from "@/lib/stats/tiers";
import styles from "./TierGraph.module.css";

const EOK = 10000;

export interface GraphPoint {
  ym: string;
  priceManwon: number | null;
  level: TierLevel | null;
}

export interface GraphTrade {
  dealDate: string;
  priceManwon: number;
}

/**
 * op.gg's tier graph for an apartment: the month-end representative price
 * over the tier bands it climbed through, with each 84㎡ deal as a dot.
 */
export function TierGraph({
  points,
  trades,
  variant,
}: {
  points: GraphPoint[];
  trades: GraphTrade[];
  variant: "wide" | "narrow";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wide = variant === "wide";
  const W = wide ? 760 : 360;
  const H = wide ? 360 : 280;
  const M = wide ? { top: 16, right: 108, bottom: 30, left: 46 } : { top: 14, right: 70, bottom: 28, left: 38 };

  const known = points.filter((p) => p.priceManwon !== null).map((p) => p.priceManwon!);
  if (known.length < 2) return <p className={styles.none}>그래프를 그릴 만큼 거래가 없어요</p>;
  const values = [...known, ...trades.map((t) => t.priceManwon)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || EOK;
  const y = scaleLinear()
    .domain([Math.max(0, lo - span * 0.12), hi + span * 0.12])
    .range([H - M.bottom, M.top])
    .nice(5);
  const [d0, d1] = y.domain();

  const start = points[0].ym;
  const monthIndex = (ym: string) => (Number(ym.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(ym.slice(4)) - Number(start.slice(4));
  const last = points.length - 1;
  const x = scaleLinear().domain([0, last]).range([M.left, W - M.right]);
  const dayX = (iso: string) => x(monthIndex(iso.slice(0, 4) + iso.slice(5, 7)) + (Number(iso.slice(8, 10)) - 15) / 30);

  const path = line<GraphPoint>()
    .defined((p) => p.priceManwon !== null)
    .x((_, i) => x(i))
    .y((p) => y(p.priceManwon!))(points);

  // tier bands crossing the visible range, bottom (iron) to top
  const bands = [...TIERS]
    .reverse()
    .map((tier) => {
      const top = tier.level === 0 ? Infinity : TIERS[tier.level - 1].minManwon;
      return { tier, lo: Math.max(tier.minManwon, d0), hi: Math.min(top, d1) };
    })
    .filter((b) => b.hi > b.lo);

  const years = points.map((p, i) => ({ p, i })).filter(({ p }) => p.ym.endsWith("01"));
  const nowPoint = [...points].reverse().find((p) => p.priceManwon !== null)!;
  const nowIndex = points.lastIndexOf(nowPoint);
  const h = hover === null ? null : points[hover];

  return (
    <div className={styles.frame}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="월말 대표가와 티어 구간"
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          const i = Math.round(x.invert(px));
          setHover(i >= 0 && i <= last ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {bands.map(({ tier, lo: bLo, hi: bHi }) => (
          <g key={tier.id}>
            <rect
              x={M.left}
              y={y(bHi)}
              width={W - M.left - M.right}
              height={y(bLo) - y(bHi)}
              fill={TIER_COLOR[tier.id]}
              opacity={tier.level % 2 === 0 ? 0.07 : 0.035}
            />
            {bLo > d0 && <line x1={M.left} x2={W - M.right} y1={y(bLo)} y2={y(bLo)} stroke={TIER_COLOR[tier.id]} strokeOpacity={0.35} />}
            {y(bLo) - y(bHi) > 14 && (
              <g transform={`translate(${W - M.right + 10}, ${(y(bLo) + y(bHi)) / 2})`}>
                <rect x={0} y={-6} width={3} height={12} rx={1.5} fill={TIER_COLOR[tier.id]} />
                <text x={9} dominantBaseline="middle" className={styles.band}>
                  {tier.name}
                </text>
              </g>
            )}
          </g>
        ))}

        {y.ticks(5).map((v) => (
          <text key={v} x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className={styles.tick}>
            {v / EOK}억
          </text>
        ))}
        {years.map(({ p, i }) => (
          <g key={p.ym}>
            <line x1={x(i)} x2={x(i)} y1={M.top} y2={H - M.bottom} className={styles.grid} />
            <text x={x(i)} y={H - 8} textAnchor="middle" className={styles.tick}>
              {wide ? `${p.ym.slice(0, 4)}년` : `’${p.ym.slice(2, 4)}`}
            </text>
          </g>
        ))}

        {trades.map((t, i) => (
          <circle
            key={i}
            cx={dayX(t.dealDate)}
            cy={y(t.priceManwon)}
            r={wide ? 2.6 : 2.2}
            className={styles.deal}
          />
        ))}

        <path d={path!} className={styles.line} />

        <circle cx={x(nowIndex)} cy={y(nowPoint.priceManwon!)} r={5} className={styles.now} />

        {h && h.priceManwon !== null && (
          <g pointerEvents="none">
            <line x1={x(hover!)} x2={x(hover!)} y1={M.top} y2={H - M.bottom} className={styles.cross} />
            <circle cx={x(hover!)} cy={y(h.priceManwon)} r={4.5} className={styles.hoverDot} />
          </g>
        )}
      </svg>

      {h && h.priceManwon !== null && (
        <div
          className={styles.tip}
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > last * 0.6 ? "-104%" : "4%"})` }}
          role="status"
        >
          <b className="num">{(h.priceManwon / EOK).toFixed(2)}억</b>
          <span>
            {h.ym.slice(0, 4)}년 {Number(h.ym.slice(4))}월 말
          </span>
          {h.level !== null && (
            <span className={styles.tipTier}>
              <i style={{ background: TIER_COLOR[TIERS[h.level].id] }} />
              {TIERS[h.level].name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
