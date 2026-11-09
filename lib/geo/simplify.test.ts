import { describe, expect, it } from "vitest";
import { centroid, simplifyLine, simplifyMultiPolygon, simplifyRing, type Ring } from "./simplify";

describe("simplifyLine", () => {
  it("곧은 선 가운데 점은 지운다", () => {
    expect(simplifyLine([[0, 0], [1, 0.00001], [2, 0]], 0.001)).toEqual([[0, 0], [2, 0]]);
  });
  it("허용치보다 튀어나온 점은 남긴다", () => {
    expect(simplifyLine([[0, 0], [1, 1], [2, 0]], 0.1)).toEqual([[0, 0], [1, 1], [2, 0]]);
  });
});

describe("simplifyRing", () => {
  const square: Ring = [[0, 0], [0.5, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  it("닫힌 고리로 돌려준다", () => {
    const r = simplifyRing(square, 0.01)!;
    expect(r[0]).toEqual(r[r.length - 1]);
    expect(r).toHaveLength(5);
  });
  it("허용치보다 작은 고리는 버린다", () => {
    expect(simplifyRing([[0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0]], 0.01)).toBeNull();
  });
  it("소수 다섯째 자리로 자른다", () => {
    const r = simplifyRing([[0.123456, 0], [1, 0], [1, 1], [0.123456, 0]], 0)!;
    expect(r[0]).toEqual([0.12346, 0]);
  });
});

describe("simplifyMultiPolygon", () => {
  it("바깥 고리가 사라진 다각형은 뺀다", () => {
    const big: Ring = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const tiny: Ring = [[5, 5], [5.00001, 5], [5.00001, 5.00001], [5, 5]];
    expect(simplifyMultiPolygon([[big], [tiny]], 0.01)).toHaveLength(1);
  });
});

describe("centroid", () => {
  it("정사각형 가운데", () => {
    expect(centroid([[[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]])).toEqual([1, 1]);
  });
});
