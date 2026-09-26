import { describe, expect, it } from "vitest";
import { TIERS } from "@/lib/stats/tiers";
import { brandFacets, crestFacets } from "./geometry";

const points = (facet: { points: string }) =>
  facet.points.split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);

describe("crestFacets", () => {
  it("draws every tier inside the 120×120 box", () => {
    for (const tier of TIERS) {
      for (const facet of crestFacets(tier.id)) {
        for (const [x, y] of points(facet)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(120);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it("adds ornament as the ladder climbs: no tier is plainer than the one below it", () => {
    const counts = [...TIERS].reverse().map((t) => crestFacets(t.id).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
  });

  it("uses only flat hex fills, which share cards can draw", () => {
    for (const tier of TIERS) {
      for (const facet of crestFacets(tier.id)) expect(facet.fill).toMatch(/^#[0-9a-f]{6}$/);
    }
    for (const facet of brandFacets()) expect(facet.fill).toMatch(/^#[0-9a-f]{6}$/);
  });
});
