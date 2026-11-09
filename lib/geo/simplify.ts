/** 경계 줄이기: Douglas–Peucker + 소수점 자르기. 좌표는 [경도, 위도]. */

export type Position = [number, number];
export type Ring = Position[];
export type Polygon = Ring[];

function sqSegDist(p: Position, a: Position, b: Position): number {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** 열린 선을 줄인다. 첫 점과 끝 점은 남는다. */
export function simplifyLine(points: Position[], tolerance: number): Position[] {
  if (points.length <= 2) return points.slice();
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxSq) {
        maxSq = d;
        index = i;
      }
    }
    if (index !== -1 && maxSq > sq) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

/** 닫힌 고리를 줄인다. 4점(삼각형) 밑으로 줄면 null — 버린다. */
export function simplifyRing(ring: Ring, tolerance: number, digits = 5): Ring | null {
  const out: Ring = [];
  for (const [x, y] of simplifyLine(ring, tolerance)) {
    const p: Position = [round(x, digits), round(y, digits)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  if (out.length < 4) return null;
  const [a, z] = [out[0], out[out.length - 1]];
  if (a[0] !== z[0] || a[1] !== z[1]) out.push([a[0], a[1]]);
  return out;
}

/** 다각형 여럿을 줄인다. 바깥 고리가 사라진 다각형은 통째로 버리고, 구멍만 사라지면 구멍만 뺀다. */
export function simplifyMultiPolygon(polys: Polygon[], tolerance: number, digits = 5): Polygon[] {
  const out: Polygon[] = [];
  for (const poly of polys) {
    const [outer, ...holes] = poly;
    const o = simplifyRing(outer, tolerance, digits);
    if (!o) continue;
    out.push([o, ...holes.map((h) => simplifyRing(h, tolerance, digits)).filter((h): h is Ring => h !== null)]);
  }
  return out;
}

/** 다각형들 바깥 고리의 넓이 가중 중심 (점으로 대신 그릴 때). */
export function centroid(polys: Polygon[]): Position | null {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const poly of polys) {
    const ring = poly[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      area += f;
      cx += (ring[j][0] + ring[i][0]) * f;
      cy += (ring[j][1] + ring[i][1]) * f;
    }
  }
  if (area === 0) return null;
  return [cx / (3 * area), cy / (3 * area)];
}
