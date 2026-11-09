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

  it("traces the leader's representative price at every month end since January 2006", () => {
    const withWinter = complex("11710-1", "잠실엘스", [t("2025-12-10", 290000), t("2026-09-20", 310000), t("2026-09-01", 300000)]);

    const snap = buildRegionSnapshot(region, [withWinter], AS_OF);

    expect(snap.history).toHaveLength(249);
    expect(snap.history[0]).toEqual({ ym: "200601", priceManwon: null });
    expect(snap.history.find((h) => h.ym === "202601")).toEqual({ ym: "202601", priceManwon: 290000 });
    expect(snap.history.at(-1)).toEqual({ ym: "202609", priceManwon: 305000 });
  });

  it("prices each past month by the leader of that month, naming it when it is not today's", () => {
    const veteran = complex("11710-9", "옛대장", [t("2012-03-10", 90000), t("2012-05-10", 92000), t("2012-06-20", 94000)], 1995);
    const today = complex("11710-1", "잠실엘스", [t("2026-09-20", 310000), t("2026-09-01", 300000), t("2026-08-01", 300000)]);

    const snap = buildRegionSnapshot(region, [veteran, today], AS_OF);

    expect(snap.history.find((h) => h.ym === "201206")).toEqual({ ym: "201206", priceManwon: 93000, leaderName: "옛대장" });
    expect(snap.history.find((h) => h.ym === "201906")).toEqual({ ym: "201906", priceManwon: null });
    expect(snap.history.at(-1)).toEqual({ ym: "202609", priceManwon: 300000 });
  });

  it("judges a past leader's age in its own year", () => {
    // built 1990: 22 years old in 2012 (may lead), 36 in 2026 (may not)
    const aging = complex("11710-8", "노후단지", [t("2012-04-01", 200000), t("2012-05-01", 200000), t("2012-06-01", 200000)], 1990);
    const young = complex("11710-7", "새단지", [t("2012-04-01", 100000), t("2012-05-01", 100000), t("2012-06-01", 100000)], 2008);

    const snap = buildRegionSnapshot(region, [aging, young], "2012-06-30");

    expect(snap.history.at(-1)).toMatchObject({ priceManwon: 200000 });
  });

  describe("a sticky leader in the history", () => {
    // one 84㎡ deal on the 10th of every month in 2014–2015, priced by month
    const monthly = (aptSeq: string, name: string, price: (ym: string) => number | null) => {
      const trades: StatTrade[] = [];
      for (const y of [2014, 2015])
        for (let m = 1; m <= 12; m++) {
          const ym = `${y}${String(m).padStart(2, "0")}`;
          const p = price(ym);
          if (p !== null) trades.push(t(`${y}-${String(m).padStart(2, "0")}-10`, p));
        }
      return complex(aptSeq, name, trades, 2010);
    };
    const leaderIn = (snap: ReturnType<typeof buildRegionSnapshot>, ym: string) =>
      snap.history.find((h) => h.ym === ym)?.leaderName ?? "(오늘 대장)";

    it("keeps the sitting leader when a rival is pricier by less than the margin", () => {
      const sitting = monthly("1", "터줏대감", () => 100000);
      const rival = monthly("2", "도전자", (ym) => (ym >= "201501" ? 104000 : 90000));
      const today = complex("9", "오늘대장", [t("2026-09-01", 300000), t("2026-09-10", 300000), t("2026-09-20", 300000)]);

      const snap = buildRegionSnapshot(region, [sitting, rival, today], AS_OF);

      expect(leaderIn(snap, "201512")).toBe("터줏대감");
    });

    it("hands over only after the rival leads by the margin for three month ends in a row", () => {
      const sitting = monthly("1", "터줏대감", () => 100000);
      // 120 from 2015-03; median of the 90-day window crosses 105 at the April month end
      const rival = monthly("2", "도전자", (ym) => (ym >= "201503" ? 120000 : 90000));
      const today = complex("9", "오늘대장", [t("2026-09-01", 300000), t("2026-09-10", 300000), t("2026-09-20", 300000)]);

      const snap = buildRegionSnapshot(region, [sitting, rival, today], AS_OF);
      const firstRivalMonth = snap.history.find((h) => h.ym >= "201501" && h.leaderName === "도전자")?.ym;

      expect(leaderIn(snap, "201504")).toBe("터줏대감");
      expect(firstRivalMonth).toBeDefined();
      expect(firstRivalMonth! >= "201505").toBe(true);
      expect(leaderIn(snap, "201512")).toBe("도전자");
    });

    it("lets a back-and-forth rival never take the seat", () => {
      const sitting = monthly("1", "터줏대감", () => 100000);
      // shows up once the sitting leader holds the seat; its 90-day median swings 130 ↔ 80 month to month
      const flicker = monthly("2", "들쭉날쭉", (ym) => (ym < "201406" ? null : Number(ym.slice(4)) % 2 ? 130000 : 80000));

      const today = complex("9", "오늘대장", [t("2026-09-01", 300000), t("2026-09-10", 300000), t("2026-09-20", 300000)]);

      const snap = buildRegionSnapshot(region, [sitting, flicker, today], AS_OF);
      const names = new Set(snap.history.filter((h) => h.ym >= "201406" && h.ym <= "201512").map((h) => h.leaderName ?? "(오늘 대장)"));

      expect(names).toEqual(new Set(["터줏대감"]));
    });

    it("carries the sitting leader through a thin month instead of dipping to a cheaper complex", () => {
      // no deals Jun–Dec 2015: its 90/180-day windows run dry but it traded within the year
      const sitting = monthly("1", "터줏대감", (ym) => (ym >= "201506" ? null : 100000));
      const cheaper = monthly("2", "싼단지", () => 70000);
      const today = complex("9", "오늘대장", [t("2026-09-01", 300000), t("2026-09-10", 300000), t("2026-09-20", 300000)]);

      const snap = buildRegionSnapshot(region, [sitting, cheaper, today], AS_OF);

      expect(snap.history.find((h) => h.ym === "201510")).toMatchObject({ leaderName: "터줏대감", priceManwon: 100000 });
    });

    it("gives up the seat once the leader has not traded for a year", () => {
      const sitting = monthly("1", "터줏대감", (ym) => (ym >= "201501" ? null : 100000));
      const cheaper = monthly("2", "싼단지", () => 70000);
      const today = complex("9", "오늘대장", [t("2026-09-01", 300000), t("2026-09-10", 300000), t("2026-09-20", 300000)]);

      const snap = buildRegionSnapshot(region, [sitting, cheaper, today], AS_OF);

      expect(leaderIn(snap, "201512")).toBe("싼단지");
    });
  });

  it("leaves an empty region without a leader, price or history", () => {
    const snap = buildRegionSnapshot(region, [], AS_OF);

    expect(snap).toMatchObject({ leader: null, rep: null, contenders: [], history: [] });
  });
});
