/**
 * Tier crests, drawn from flat polygons only (no gradients or filters) so the
 * same shapes render in the page and in share cards (Satori).
 *
 * The core is a house cut like a gem, lit from the upper left. Climbing the
 * ladder adds ornament: wings from bronze that widen tier by tier, a crown
 * from master, a halo for challenger. Original
 * geometry; no game artwork is reproduced.
 */
import type { TierId } from "@/lib/stats/tiers";

export interface Facet {
  points: string;
  fill: string;
  opacity?: number;
}

export interface Material {
  dark: string;
  mid: string;
  light: string;
}

export const MATERIALS = {
  iron: { dark: "#2a2831", mid: "#625d6c", light: "#b3adbd" },
  bronze: { dark: "#43261a", mid: "#a4643f", light: "#f3c29c" },
  silver: { dark: "#434a5b", mid: "#9ba4b7", light: "#f4f6fb" },
  gold: { dark: "#6a4208", mid: "#dc9b21", light: "#ffe9a6" },
  platinum: { dark: "#0a4a55", mid: "#22b2c6", light: "#c6fbff" },
  emerald: { dark: "#16461a", mid: "#46b045", light: "#d0fbc0" },
  diamond: { dark: "#212d7a", mid: "#5d7bf8", light: "#dae4ff" },
  master: { dark: "#43146a", mid: "#a24bde", light: "#f2ccff" },
  grandmaster: { dark: "#5c0e18", mid: "#db3a44", light: "#ffc6be" },
  ice: { dark: "#12577f", mid: "#4fc0f0", light: "#eafcff" },
  crowngold: { dark: "#76500e", mid: "#e5b746", light: "#fff4c8" },
  steel: { dark: "#373c49", mid: "#8a92a4", light: "#e6e9f0" },
} satisfies Record<string, Material>;

type Pt = [number, number];

const LIGHT: Pt = normalize([-0.55, -0.83]);

function normalize([x, y]: Pt): Pt {
  const l = Math.hypot(x, y);
  return [x / l, y / l];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** Tone at t in [0, 1]: dark → mid → light. */
export function tone(m: Material, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? mix(m.dark, m.mid, k * 2) : mix(m.mid, m.light, (k - 0.5) * 2);
}

const fmt = (pts: Pt[]) => pts.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" ");
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [120 - x, y]);
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/** A convex polygon cut into bevel facets around an inner table, each shaded by its facing. */
function cut(outer: Pt[], m: Material, inset: number, tableTone: number): Facet[] {
  const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length;
  const cy = outer.reduce((s, p) => s + p[1], 0) / outer.length - 1.5;
  const inner = outer.map(([x, y]): Pt => [cx + (x - cx) * inset, cy + (y - cy) * inset]);
  const facets: Facet[] = [];
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    // outward normal of a clockwise polygon in screen space
    const n = normalize([b[1] - a[1], a[0] - b[0]]);
    const lit = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + 1) / 2;
    facets.push({ points: fmt([a, b, inner[(i + 1) % outer.length], inner[i]]), fill: tone(m, 0.1 + lit * 0.82) });
  }
  facets.push({ points: fmt(inner), fill: tone(m, tableTone) });
  // a glint on the table's upper-left corner
  const [tx, ty] = inner[inner.length - 1];
  facets.push({ points: fmt([[tx + 1.2, ty + 1], [tx + 5.2, ty - 2.2], [tx + 2.6, ty + 4.2]]), fill: "#ffffff", opacity: 0.7 });
  return facets;
}

/** The house: roof ridge at the top, eaves, walls, sill. Clockwise from the ridge. */
function house(k: number): Pt[] {
  const c: Pt = [60, 62];
  const base: Pt[] = [
    [60, 30],
    [80, 49],
    [80, 84],
    [40, 84],
    [40, 49],
  ];
  return base.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
}

interface Feather {
  /** Degrees above horizontal, pointing outward. */
  angle: number;
  length: number;
  width: number;
  /** Root height on the wall. */
  y: number;
}

/** One feather on the right side: straight upper edge, full lower belly, split along the spine. */
function feather({ angle, length, width, y }: Feather, m: Material, side: "left" | "right"): Facet[] {
  const a = (angle * Math.PI) / 180;
  const dir: Pt = [Math.cos(a), -Math.sin(a)];
  const up: Pt = [dir[1], -dir[0]];
  const root: Pt = [74, y];
  const tip = add(root, dir, length);
  const top = add(root, up, width);
  const bottom = add(root, up, -width);
  const belly = add(add(root, dir, length * 0.52), up, -width * 0.78);
  const upper: Pt[] = [top, tip, root];
  const lower: Pt[] = [root, tip, belly, bottom];
  const place = (pts: Pt[]) => (side === "right" ? pts : mirror(pts));
  // the left wing faces the light
  const [u, l] = side === "left" ? [0.84, 0.46] : [0.62, 0.24];
  return [
    { points: fmt(place(lower)), fill: tone(m, l) },
    { points: fmt(place(upper)), fill: tone(m, u) },
  ];
}

/** Both wings, lowest feather first so upper feathers overlap it. */
function wings(feathers: Feather[], m: Material | ((i: number) => Material)): Facet[] {
  const pick = typeof m === "function" ? m : () => m;
  const out: Facet[] = [];
  [...feathers]
    .map((f, i) => ({ f, i }))
    .sort((p, q) => p.f.y - q.f.y)
    .reverse()
    .forEach(({ f, i }) => out.push(...feather(f, pick(i), "left"), ...feather(f, pick(i), "right")));
  return out;
}

/** A crown set on the ridge: a band and `points` spikes, the middle one tallest. */
function crown(points: 3 | 5, m: Material, jewel: Material, k: number): Facet[] {
  const out: Facet[] = [];
  const span = (points === 3 ? 13 : 17) * k;
  const bandBottom = 31;
  const bandTop = bandBottom - 5 * k;
  const left = 60 - span;
  const right = 60 + span;
  const step = (right - left) / (points * 2);
  for (let i = 0; i < points; i++) {
    const x0 = left + step * 2 * i;
    const x1 = x0 + step * 2;
    const mid = (x0 + x1) / 2;
    const centre = Math.abs(i - (points - 1) / 2);
    const height = (13 - centre * 3) * k;
    out.push(
      { points: fmt([[x0, bandTop], [mid, bandTop - height], [mid, bandTop]]), fill: tone(m, 0.92) },
      { points: fmt([[mid, bandTop], [mid, bandTop - height], [x1, bandTop]]), fill: tone(m, 0.5) },
    );
  }
  out.push(
    { points: fmt([[left, bandTop], [right, bandTop], [right - 1.5, bandBottom], [left + 1.5, bandBottom]]), fill: tone(m, 0.7) },
    { points: fmt([[left + 1.5, bandBottom], [right - 1.5, bandBottom], [right - 2.5, bandBottom + 1.6], [left + 2.5, bandBottom + 1.6]]), fill: tone(m, 0.25) },
    { points: fmt([[60, bandTop + 0.6], [62.6, (bandTop + bandBottom) / 2], [60, bandBottom - 0.6], [57.4, (bandTop + bandBottom) / 2]]), fill: tone(jewel, 0.82) },
  );
  return out;
}

function halo(m: Material): Facet[] {
  const ring: Pt[] = [];
  const inner: Pt[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring.push([60 + Math.cos(a) * 50, 60 + Math.sin(a) * 50]);
    inner.push([60 + Math.cos(a) * 47.5, 60 + Math.sin(a) * 47.5]);
  }
  return [{ points: fmt([...ring, ...inner.reverse()]), fill: tone(m, 0.7), opacity: 0.55 }];
}

/** Wings: feathers stacked on the wall, longest on top, tips stepping inward toward the sill. */
function wingSet(count: number, reach: number, lift: number): Feather[] {
  const rows = [
    { y: 50, width: 7 },
    { y: 57, width: 6.6 },
    { y: 64, width: 6.2 },
    { y: 71, width: 5.8 },
    { y: 78, width: 5.4 },
  ];
  return rows.slice(0, count).map((row, i) => ({
    y: row.y,
    width: row.width,
    angle: lift - i * 7,
    length: reach - i * (reach * 0.16),
  }));
}

/** Facets for a tier's crest in a 120×120 box, back to front. */
export function crestFacets(tier: TierId): Facet[] {
  const M = MATERIALS;
  switch (tier) {
    case "iron":
      return cut(house(0.8), M.iron, 0.5, 0.58);
    case "bronze":
      return [...wings(wingSet(1, 24, 18), M.bronze), ...cut(house(0.86), M.bronze, 0.48, 0.66)];
    case "silver":
      return [...wings(wingSet(2, 30, 20), M.silver), ...cut(house(0.92), M.silver, 0.46, 0.7)];
    case "gold":
      return [...wings(wingSet(3, 36, 22), M.gold), ...cut(house(1), M.gold, 0.45, 0.72)];
    case "platinum":
      return [...wings(wingSet(3, 41, 24), M.platinum), ...cut(house(1), M.platinum, 0.45, 0.74)];
    case "emerald":
      return [...wings(wingSet(4, 43, 26), M.emerald), ...cut(house(1), M.emerald, 0.44, 0.74)];
    case "diamond":
      return [...wings(wingSet(4, 46, 28), M.diamond), ...cut(house(1), M.diamond, 0.42, 0.8)];
    case "master":
      return [
        ...wings(wingSet(4, 46, 28), (i) => (i === 3 ? M.steel : M.master)),
        ...cut(house(1), M.master, 0.42, 0.8),
        ...crown(3, M.steel, M.master, 0.8),
      ];
    case "grandmaster":
      return [
        ...wings(wingSet(5, 47, 30), (i) => (i >= 3 ? M.crowngold : M.grandmaster)),
        ...cut(house(1), M.grandmaster, 0.42, 0.8),
        ...crown(3, M.crowngold, M.grandmaster, 1),
      ];
    case "challenger":
      return [
        ...halo(M.crowngold),
        ...wings(wingSet(5, 48, 30), (i) => (i % 2 === 0 ? M.crowngold : M.ice)),
        ...cut(house(1), M.ice, 0.42, 0.84),
        ...crown(5, M.crowngold, M.ice, 1),
      ];
  }
}

/** The site's mark: the house cut alone, in moonlight. */
export function brandFacets(): Facet[] {
  return cut(house(1.75), { dark: "#33415f", mid: "#8fa5d6", light: "#ffffff" }, 0.44, 0.82);
}
