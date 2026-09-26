import { describe, expect, it } from "vitest";
import { buildRegionSnapshot, type ComplexHistory } from "./snapshot";
import type { StatTrade } from "./representative";
import type { RegionDef } from "@/data/regions";

const t = (dealDate: string, priceManwon: number, over: Partial<StatTrade> = {}): StatTrade => ({
  dealDate,
  priceManwon,
  areaM2: 84.97,
  floor: 10,
  dealingType: "중개거래",
  cancelled: false,
  removed: false,
  ...over,
});

const complex = (aptSeq: string, name: string, trades: StatTrade[], buildYear = 2010): ComplexHistory => ({
  aptSeq,
  name,
  buildYear,
  umdName: "잠실동",
  trades,
});

const region: RegionDef = {
  slug: "jamsil",
  name: "잠실",
  area: "서울 송파구",
  sido: "서울",
  districts: [{ code: "11710" }],
  dongs: ["잠실동"],
};

const AS_OF = "2026-09-26";

describe("buildRegionSnapshot", () => {
  const els = complex("11710-1", "잠실엘스", [t("2026-09-20", 310000), t("2026-09-01", 300000)]);
  const ricenz = complex("11710-2", "리센츠", [t("2026-09-10", 290000), t("2026-08-20", 295000)]);
  const old = complex("11710-3", "옛단지", [t("2024-01-10", 400000)]);

  it("lets the priciest fresh complex lead when no leader is configured", () => {
    const snap = buildRegionSnapshot(region, [ricenz, els, old], AS_OF);

    expect(snap.leader?.name).toBe("잠실엘스");
    expect(snap.rep?.priceManwon).toBe(305000);
  });

  describe("picking a leader on its own", () => {
    const busy = (aptSeq: string, name: string, price: number, buildYear: number) =>
      complex(aptSeq, name, [t("2026-09-20", price), t("2026-07-01", price), t("2026-03-01", price)], buildYear);

    it("passes over a complex 30 years or older, which trades on redevelopment", () => {
      const eunma = busy("11680-1", "은마", 380000, 1979);
      const raemian = busy("11680-2", "래미안대치팰리스", 350000, 2015);

      expect(buildRegionSnapshot(region, [eunma, raemian], AS_OF).leader?.name).toBe("래미안대치팰리스");
      expect(buildRegionSnapshot(region, [busy("x", "30년차", 380000, 1996), raemian], AS_OF).leader?.name).toBe(
        "래미안대치팰리스",
      );
      expect(buildRegionSnapshot(region, [busy("x", "29년차", 380000, 1997), raemian], AS_OF).leader?.name).toBe(
        "29년차",
      );
    });

    it("passes over a complex with fewer than three 84㎡ deals in the past year", () => {
      const oneDeal = complex("11710-9", "한건단지", [t("2026-09-20", 500000)], 2020);
      const steady = busy("11710-1", "잠실엘스", 310000, 2008);

      expect(buildRegionSnapshot(region, [oneDeal, steady], AS_OF).leader?.name).toBe("잠실엘스");
    });

    it("falls back to the priciest complex when none qualifies", () => {
      const eunma = busy("11680-1", "은마", 380000, 1979);
      const oneDeal = complex("11680-3", "한건단지", [t("2026-09-20", 300000)], 2020);

      expect(buildRegionSnapshot(region, [oneDeal, eunma], AS_OF).leader?.name).toBe("은마");
    });

    it("still lets a configured leader win over the rule", () => {
      const eunma = busy("11680-1", "은마", 380000, 1979);
      const raemian = busy("11680-2", "래미안대치팰리스", 350000, 2015);

      expect(buildRegionSnapshot({ ...region, leaderAptSeq: "11680-1" }, [eunma, raemian], AS_OF).leader?.name).toBe(
        "은마",
      );
    });
  });

  it("keeps a configured leader even when another complex is pricier", () => {
    const snap = buildRegionSnapshot({ ...region, leaderAptSeq: "11710-2" }, [ricenz, els], AS_OF);

    expect(snap.leader?.name).toBe("리센츠");
  });

  it("ranks up to five contenders, fresh prices before stale ones", () => {
    const snap = buildRegionSnapshot(region, [old, ricenz, els], AS_OF);

    expect(snap.contenders.map((c) => c.name)).toEqual(["잠실엘스", "리센츠", "옛단지"]);
    expect(snap.contenders[2].stale).toBe(true);
  });

  it("measures the leader against its 2021–2022 peak", () => {
    const withPeak = complex("11710-1", "잠실엘스", [
      t("2021-10-05", 270000),
      t("2026-09-20", 310000),
      t("2026-09-01", 300000),
    ]);

    const snap = buildRegionSnapshot(region, [withPeak], AS_OF);

    expect(snap.peak).toEqual({ priceManwon: 270000, dealDate: "2021-10-05" });
    expect(snap.vsPeak).toBeCloseTo(305000 / 270000 - 1);
  });

  it("keeps the leader's all-time high", () => {
    const snap = buildRegionSnapshot(region, [els], AS_OF);

    expect(snap.high).toEqual({ priceManwon: 310000, dealDate: "2026-09-20" });
  });

  it("traces the leader's representative price at every month end since January 2021", () => {
    const withWinter = complex("11710-1", "잠실엘스", [t("2025-12-10", 290000), t("2026-09-20", 310000), t("2026-09-01", 300000)]);

    const snap = buildRegionSnapshot(region, [withWinter], AS_OF);

    expect(snap.history).toHaveLength(69);
    expect(snap.history[0]).toEqual({ ym: "202101", priceManwon: null });
    expect(snap.history.find((h) => h.ym === "202601")).toEqual({ ym: "202601", priceManwon: 290000 });
    expect(snap.history.at(-1)).toEqual({ ym: "202609", priceManwon: 305000 });
  });

  it("leaves an empty region without a leader, price or history", () => {
    const snap = buildRegionSnapshot(region, [], AS_OF);

    expect(snap).toMatchObject({ leader: null, rep: null, contenders: [], history: [] });
  });
});
