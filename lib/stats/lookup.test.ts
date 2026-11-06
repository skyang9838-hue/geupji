import { describe, expect, it } from "vitest";
import { placeAmong } from "./lookup";

const EOK = 10000;

const ladder = [
  { key: "banpo", priceManwon: 60 * EOK, anchor: true, challenger: true },
  { key: "jamsil", priceManwon: 40 * EOK, anchor: true },
  { key: "mapo", priceManwon: 30 * EOK, anchor: true },
  { key: "songdo", priceManwon: 10 * EOK },
  { key: "cheongna", priceManwon: 8 * EOK },
];

describe("placeAmong", () => {
  it("ranks an outside complex as if it joined today's ladder", () => {
    const p = placeAmong(ladder, 9 * EOK)!;
    expect(p.standing.rank).toBe(5); // between 송도 (4) and 청라 (now 6)
    expect(p.above).toBe("songdo");
    expect(p.below).toBe("cheongna");
  });

  it("does not move the Seoul anchor", () => {
    const p = placeAmong(ladder, 9 * EOK)!;
    expect(p.standing.anchorManwon).toBeCloseTo((60 + 40 + 30) * EOK / 3);
  });

  it("never takes a hand-picked challenger seat, even above every price", () => {
    const p = placeAmong(ladder, 80 * EOK)!;
    expect(p.standing.tier.id).not.toBe("challenger");
    expect(p.above).toBe("banpo");
  });

  it("sits at the bottom with nobody below", () => {
    const p = placeAmong(ladder, 1 * EOK)!;
    expect(p.standing.tier.id).toBe("iron");
    expect(p.below).toBeNull();
    expect(p.above).toBe("cheongna");
  });

  it("has no place without a price", () => {
    expect(placeAmong(ladder, 0)).toBeNull();
  });
});
