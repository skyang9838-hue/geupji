import type { ReactNode } from "react";
import styles from "./SpanPicker.module.css";

/** Spans to pick from: the last year month by month, longer runs one point a year. */
export const SPANS = [
  { key: "1y", label: "1년", months: 12, step: 1 },
  { key: "12y", label: "12년", months: 144, step: 12 },
  { key: "20y", label: "20년", months: 240, step: 12 },
] as const;
export type Span = (typeof SPANS)[number];

/** Keep every `step`-th point counting back from the latest, so the last point is always now. */
export function sampleSpan<T>(points: T[], span: Span, step: number = span.step): T[] {
  const recent = points.slice(-span.months);
  return recent.filter((_, i) => (recent.length - 1 - i) % step === 0);
}

/**
 * Pill buttons for 1년 · 12년 · 20년 over one panel per span. The buttons are
 * radios and CSS shows the checked panel, so it works without a script.
 */
export function SpanPicker({
  name,
  initial = "1y",
  children,
}: {
  /** Unique on the page: names the radio group. */
  name: string;
  initial?: Span["key"];
  children: (span: Span) => ReactNode;
}) {
  return (
    <div className={styles.picker}>
      {SPANS.map((span) => (
        <input
          key={span.key}
          type="radio"
          name={name}
          id={`${name}-${span.key}`}
          value={span.key}
          defaultChecked={span.key === initial}
          className={styles.input}
        />
      ))}
      <div className={styles.spans} role="group" aria-label="기간">
        {SPANS.map((span) => (
          <label key={span.key} htmlFor={`${name}-${span.key}`} className={styles.span} data-span={span.key}>
            {span.label}
          </label>
        ))}
      </div>
      {SPANS.map((span) => (
        <div key={span.key} className={styles.panel} data-span={span.key}>
          {children(span)}
        </div>
      ))}
    </div>
  );
}
