import type { CSSProperties } from "react";
import { curveBumpX, line } from "d3-shape";
import type { RegionDef } from "@/data/regions";
import type { RegionSnapshot } from "@/lib/stats/snapshot";
import styles from "./RankFlow.module.css";

const MONTHS = 12;

interface Series {
  slug: string;
  name: string;
  tier: string;
  ranks: Array<number | null>;
  move: number | null;
}

/**
 * Bump chart of month-end ranks over the last year. Every line is quiet; the
 * biggest climber and faller are lit, and pointing at any line lights it alone.
 */
export function RankFlow({ snapshots, regions }: { snapshots: RegionSnapshot[]; regions: RegionDef[] }) {
  const bySlug = new Map(regions.map((r) => [r.slug, r]));
  const series: Series[] = snapshots
    .filter((s) => s.standing)
    .map((s) => {
      const ranks = s.ladder.slice(-MONTHS).map((p) => p.rank);
      const first = ranks.find((r) => r !== null) ?? null;
      const last = ranks.at(-1) ?? null;
      return {
        slug: s.regionSlug,
        name: bySlug.get(s.regionSlug)?.name ?? s.regionSlug,
        tier: s.standing!.tier.id,
        ranks,
        move: first !== null && last !== null ? first - last : null,
      };
    })
    .sort((a, b) => (a.ranks.at(-1) ?? 99) - (b.ranks.at(-1) ?? 99));

  const months = snapshots.find((s) => s.ladder.length)?.ladder.slice(-MONTHS).map((p) => p.ym) ?? [];
  if (!series.length || months.length < 2) return null;

  const climber = maxBy(series, (s) => s.move ?? -Infinity);
  const faller = maxBy(series, (s) => -(s.move ?? Infinity));
  const lit = new Set([climber, faller].filter((s): s is Series => !!s && s.move !== 0).map((s) => s.slug));

  const moves = series
    .filter((s) => s.move)
    .sort((a, b) => Math.abs(b.move!) - Math.abs(a.move!))
    .slice(0, 5)
    .map((s) => `${s.name} ${s.move! > 0 ? `${s.move}계단 상승` : `${-s.move!}계단 하락`}`)
    .join(", ");

  return (
    <figure className={styles.figure}>
      {(["wide", "narrow"] as const).map((variant) => (
        <div key={variant} className={`${variant}-only`}>
          <Plot variant={variant} series={series} months={months} lit={lit} />
        </div>
      ))}
      <figcaption className="visually-hidden">최근 12개월 순위 변동이 큰 곳: {moves || "없음"}</figcaption>
    </figure>
  );
}

function Plot({
  variant,
  series,
  months,
  lit,
}: {
  variant: "wide" | "narrow";
  series: Series[];
  months: string[];
  lit: Set<string>;
}) {
  const wide = variant === "wide";
  const rows = Math.max(...series.flatMap((s) => s.ranks.map((r) => r ?? 0)));
  const M = wide ? { top: 14, right: 150, bottom: 34, left: 110 } : { top: 12, right: 92, bottom: 30, left: 64 };
  const W = wide ? 1200 : 380;
  const rowH = wide ? 26 : 23;
  const H = M.top + (rows - 1) * rowH + M.bottom;
  const plotW = W - M.left - M.right;
  const x = (i: number) => M.left + (i / (months.length - 1)) * plotW;
  const y = (rank: number) => M.top + (rank - 1) * rowH;
  const path = line<[number, number | null]>()
    .defined(([, r]) => r !== null)
    .x(([i]) => x(i))
    .y(([, r]) => y(r!))
    .curve(curveBumpX);
  const tickEvery = wide ? 1 : 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`${styles.svg} ${lit.size ? styles.hasLit : ""}`}
      role="img"
      aria-label="최근 12개월 월말 순위 변동"
    >
      {months.map((ym, i) => (
        <g key={ym}>
          <line x1={x(i)} x2={x(i)} y1={M.top - 6} y2={H - M.bottom + 8} className={styles.grid} />
          {(months.length - 1 - i) % tickEvery === 0 && (
            <text x={x(i)} y={H - 10} textAnchor="middle" className={styles.month}>
              {`${ym.slice(2, 4)}.${ym.slice(4)}`}
            </text>
          )}
        </g>
      ))}

      {series.map((s) => {
        const first = s.ranks.findIndex((r) => r !== null);
        const last = s.ranks.length - 1;
        const now = s.ranks[last];
        return (
          <a
            key={s.slug}
            href={`/r/${s.slug}`}
            tabIndex={-1}
            className={`${styles.series} ${lit.has(s.slug) ? styles.lit : ""}`}
            style={{ "--c": `var(--t-${s.tier})` } as CSSProperties}
          >
            <path d={path(s.ranks.map((r, i) => [i, r]))!} className={styles.hit} />
            <path d={path(s.ranks.map((r, i) => [i, r]))!} className={styles.line} />
            {first >= 0 && s.ranks[first] !== null && (
              <text x={x(first) - 12} y={y(s.ranks[first]!)} textAnchor="end" dominantBaseline="middle" className={styles.start}>
                {s.name}
              </text>
            )}
            {now !== null && (
              <>
                <circle cx={x(last)} cy={y(now)} r={wide ? 4 : 3.5} className={styles.dot} />
                <text x={x(last) + 12} y={y(now)} dominantBaseline="middle" className={styles.end}>
                  <tspan className={styles.endRank}>{now}</tspan>
                  <tspan dx="6">{s.name}</tspan>
                  {s.move ? (
                    <tspan dx="6" className={s.move > 0 ? styles.upText : styles.downText}>
                      {s.move > 0 ? `▲${s.move}` : `▼${-s.move}`}
                    </tspan>
                  ) : null}
                </text>
              </>
            )}
          </a>
        );
      })}
    </svg>
  );
}

function maxBy<T>(items: T[], score: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}
