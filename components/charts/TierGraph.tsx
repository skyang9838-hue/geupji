"use client";

import { useState } from "react";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { TIER_COLOR } from "@/lib/emblem/colors";
import { TIERS, tierPriceRange, type TierLevel } from "@/lib/stats/tiers";
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
  anchorManwon,
  variant,
}: {
  points: GraphPoint[];
  trades: GraphTrade[];
  /** Today's Seoul anchor: the bands are drawn at today's 급지 prices. */
  anchorManwon: number;
  variant: "wide" | "narrow";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wide = variant === "wide";
  // Sized so the text lands at 15px+ on screen: the wide drawing renders at
  // ~600–950px, the narrow one at ~320px.
  const W = wide ? 680 : 360;
  const H = wide ? 360 : 300;
  const FS = wide ? 17.5 : 18;
  const M = wide ? { top: 16, right: 112, bottom: 38, left: 54 } : { top: 14, right: 108, bottom: 36, left: 50 };

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
    .flatMap((tier) => {
      const range = tierPriceRange(tier, anchorManwon);
      return range ? [{ tier, lo: Math.max(range.lo, d0), hi: Math.min(range.hi, d1) }] : [];
    })
    .filter((b) => b.hi > b.lo);

  // Band name tags on the right edge: centered on their band, pushed apart so
  // no two overlap, and the thinnest bands dropped if they cannot all fit.
  const gap = FS + 5;
  const top = M.top + FS / 2;
  const bottom = H - M.bottom - FS / 2;
  let tags = bands.map((b) => ({ tier: b.tier, size: y(b.lo) - y(b.hi), at: (y(b.lo) + y(b.hi)) / 2 })).filter((t) => t.size >= 3);
  while (tags.length > 1 && (tags.length - 1) * gap > bottom - top) {
    const thinnest = tags.reduce((a, b) => (b.size < a.size ? b : a));
    tags = tags.filter((t) => t !== thinnest);
  }
  tags.sort((a, b) => a.at - b.at);
  tags.forEach((t, i) => (t.at = Math.max(t.at, top, i > 0 ? tags[i - 1].at + gap : -Infinity)));
  for (let i = tags.length - 1; i >= 0; i--) tags[i].at = Math.min(tags[i].at, bottom, i < tags.length - 1 ? tags[i + 1].at - gap : Infinity);

  // one tick per January, thinned on long spans so labels never touch (≤8 wide, ≤5 narrow)
  const januaries = points.map((p, i) => ({ p, i })).filter(({ p }) => p.ym.endsWith("01"));
  const every = Math.ceil(januaries.length / (wide ? 8 : 5));
  const years = januaries.filter((_, k) => (januaries.length - 1 - k) % every === 0);
  const nowPoint = [...points].reverse().find((p) => p.priceManwon !== null)!;
  const nowIndex = points.lastIndexOf(nowPoint);
  const h = hover === null ? null : points[hover];

  return (
    <div className={styles.frame}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        style={{ fontSize: FS }}
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
              opacity={tier.level % 2 === 0 ? 0.045 : 0.025}
            />
            {bLo > d0 && <line x1={M.left} x2={W - M.right} y1={y(bLo)} y2={y(bLo)} stroke={TIER_COLOR[tier.id]} strokeOpacity={0.3} />}
          </g>
        ))}
        {tags.map(({ tier, at }) => (
          <g key={tier.id} transform={`translate(${W - M.right + 10}, ${at})`}>
            <rect x={0} y={-7} width={3} height={14} rx={1.5} fill={TIER_COLOR[tier.id]} />
            <text x={10} dominantBaseline="central" className={styles.band}>
              {tier.name}
            </text>
          </g>
        ))}

        {y.ticks(5).map((v) => (
          <text key={v} x={M.left - 10} y={y(v)} textAnchor="end" dominantBaseline="central" className={styles.tick}>
            {v / EOK}억
          </text>
        ))}
        {years.map(({ p, i }) => (
          <g key={p.ym}>
            <line x1={x(i)} x2={x(i)} y1={M.top} y2={H - M.bottom} className={styles.grid} />
            <text x={x(i)} y={H - 10} textAnchor="middle" className={styles.tick}>
              {wide ? `${p.ym.slice(0, 4)}년` : `’${p.ym.slice(2, 4)}`}
            </text>
          </g>
        ))}

        {trades.map((t, i) => (
          <circle
            key={i}
            cx={dayX(t.dealDate)}
            cy={y(t.priceManwon)}
            r={wide ? 3 : 2.6}
            className={styles.deal}
          />
        ))}

        <path d={path!} className={styles.line} />

        <circle cx={x(nowIndex)} cy={y(nowPoint.priceManwon!)} r={6} className={styles.now} />

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
