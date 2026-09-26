import { line } from "d3-shape";
import styles from "./Sparkline.module.css";

/** A year of representative prices in the quiet hue, the latest point in the direction's color. */
export function Sparkline({ values, width = 96, height = 28 }: { values: Array<number | null>; width?: number; height?: number }) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return <span className={styles.none}>—</span>;

  const lo = Math.min(...known);
  const hi = Math.max(...known);
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => (hi === lo ? height / 2 : pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2));
  const d = line<[number, number | null]>()
    .defined(([, v]) => v !== null)
    .x(([i]) => x(i))
    .y(([, v]) => y(v!))(values.map((v, i) => [i, v]));

  const lastIndex = values.length - 1 - [...values].reverse().findIndex((v) => v !== null);
  const last = values[lastIndex]!;
  const direction = last > known[0] ? styles.up : last < known[0] ? styles.down : styles.flat;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.spark} aria-hidden="true">
      <path d={d!} className={styles.line} />
      <circle cx={x(lastIndex)} cy={y(last)} r={3} className={direction} />
    </svg>
  );
}
