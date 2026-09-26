"use client";

import { useState } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { TIER_COLOR } from "@/lib/emblem/colors";
import { TIERS } from "@/lib/stats/tiers";
import styles from "./CompareLines.module.css";

const EOK = 10000;

/** Series slots, validated for the night surface (all four pass the dataviz checks). */
export const SERIES_COLORS = ["#cc7d0b", "#2d97d2", "#d8468a", "#6c9f28"];

export interface CompareSeries {
  slug: string;
  name: string;
  points: Array<{ ym: string; priceManwon: number | null }>;
}

/** Up to four month-end price lines on one axis, over the tier bands; one tooltip lists them all. */
export function CompareLines({ series, variant }: { series: CompareSeries[]; variant: "wide" | "narrow" }) {
  const [hover, setHover] = useState<number | null>(null);
  const wide = variant === "wide";
  const W = wide ? 1100 : 360;
  const H = wide ? 400 : 300;
  const M = wide ? { top: 16, right: 150, bottom: 30, left: 50 } : { top: 14, right: 78, bottom: 28, left: 38 };

  const months = series[0]?.points.map((p) => p.ym) ?? [];
  const values = series.flatMap((s) => s.points.map((p) => p.priceManwon).filter((v): v is number => v !== null));
  if (months.length < 2 || values.length < 2) return <p className={styles.none}>비교할 거래가 아직 없어요</p>;

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const y = scaleLinear()
    .domain([Math.max(0, lo - (hi - lo) * 0.08), hi + (hi - lo) * 0.08])
    .range([H - M.bottom, M.top])
    .nice(6);
  const [d0, d1] = y.domain();
  const last = months.length - 1;
  const x = scaleLinear().domain([0, last]).range([M.left, W - M.right]);
  const path = line<{ ym: string; priceManwon: number | null }>()
    .defined((p) => p.priceManwon !== null)
    .x((_, i) => x(i))
    .y((p) => y(p.priceManwon!));

  const bands = [...TIERS]
    .reverse()
    .map((tier) => ({ tier, lo: Math.max(tier.minManwon, d0), hi: Math.min(tier.level === 0 ? Infinity : TIERS[tier.level - 1].minManwon, d1) }))
    .filter((b) => b.hi > b.lo);

  // end labels, nudged apart when two lines finish close together
  const ends = series
    .map((s, i) => {
      const p = [...s.points].reverse().find((q) => q.priceManwon !== null);
      return p ? { i, name: s.name, y: y(p.priceManwon!), value: p.priceManwon! } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 36) ends[k].y = ends[k - 1].y + 36;

  const years = months.map((ym, i) => ({ ym, i })).filter(({ ym }) => ym.endsWith("01"));

  return (
    <div className={styles.frame}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label="단지별 월말 대표가 비교"
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const i = Math.round(x.invert(((e.clientX - box.left) / box.width) * W));
          setHover(i >= 0 && i <= last ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {bands.map(({ tier, lo: bLo, hi: bHi }) => (
          <g key={tier.id}>
            <rect x={M.left} y={y(bHi)} width={W - M.left - M.right} height={y(bLo) - y(bHi)} fill={TIER_COLOR[tier.id]} opacity={tier.level % 2 === 0 ? 0.06 : 0.03} />
            {bLo > d0 && <line x1={M.left} x2={W - M.right} y1={y(bLo)} y2={y(bLo)} stroke={TIER_COLOR[tier.id]} strokeOpacity={0.3} />}
            {y(bLo) - y(bHi) > 16 && (
              <text x={M.left + 8} y={y(bHi) + 13} className={styles.band}>
                {tier.name}
              </text>
            )}
          </g>
        ))}
        {y.ticks(6).map((v) => (
          <text key={v} x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className={styles.tick}>
            {v / EOK}억
          </text>
        ))}
        {years.map(({ ym, i }) => (
          <g key={ym}>
            <line x1={x(i)} x2={x(i)} y1={M.top} y2={H - M.bottom} className={styles.grid} />
            <text x={x(i)} y={H - 8} textAnchor="middle" className={styles.tick}>
              {wide ? `${ym.slice(0, 4)}년` : `’${ym.slice(2, 4)}`}
            </text>
          </g>
        ))}

        {series.map((s, i) => (
          <path key={s.slug} d={path(s.points)!} className={styles.line} stroke={SERIES_COLORS[i]} />
        ))}

        {ends.map((e) => (
          <g key={e.i} transform={`translate(${W - M.right + 10}, ${e.y})`}>
            <rect x={0} y={-1.5} width={12} height={3} rx={1.5} fill={SERIES_COLORS[e.i]} />
            <text x={18} y={-2} dominantBaseline="middle" className={styles.endName}>
              {e.name}
            </text>
            <text x={18} y={16} className={styles.endValue}>
              {(e.value / EOK).toFixed(2)}억
            </text>
          </g>
        ))}

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={H - M.bottom} className={styles.cross} />
            {series.map((s, i) => {
              const v = s.points[hover]?.priceManwon;
              return v == null ? null : <circle key={s.slug} cx={x(hover)} cy={y(v)} r={4.5} fill={SERIES_COLORS[i]} className={styles.hoverDot} />;
            })}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className={styles.tip}
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > last * 0.6 ? "-104%" : "4%"})` }}
          role="status"
        >
          <p className={styles.tipDate}>
            {months[hover].slice(0, 4)}년 {Number(months[hover].slice(4))}월 말
          </p>
          {series.map((s, i) => {
            const v = s.points[hover]?.priceManwon;
            return (
              <p key={s.slug} className={styles.tipRow}>
                <i style={{ background: SERIES_COLORS[i] }} />
                <b className="num">{v == null ? "—" : `${(v / EOK).toFixed(2)}억`}</b>
                <span>{s.name}</span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
