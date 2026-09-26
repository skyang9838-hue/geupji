/**
 * Fill the LOCAL dev database with a synthetic market so the pages can be
 * designed before the MOLIT key arrives. Every complex name is fictional and
 * every price is generated; the site shows a 견본 banner while
 * NEXT_PUBLIC_SAMPLE_DATA=1. Runs through the real ingest pipeline.
 *
 *   npm run db:dev            # in another terminal
 *   npx tsx scripts/seed-sample.ts
 *
 * Refuses to run against anything but localhost.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

type Anchor = [ym: number, index: number];

interface SampleRegion {
  slug: string;
  /** Leader's 84㎡ level today, 만원 */
  level: number;
  /** 2021 peak relative to today (1.3 = the peak was 30% higher) */
  peak: number;
  /** Level a year ago relative to today (0.8 = up 25% in a year); spreads the last year's ranks */
  trend?: number;
  complexes: string[];
  /** Pick of 법정동 to file the complexes under (index into region.dongs) */
  dong?: number;
}

// Fictional complexes. Levels are illustrative only.
const SAMPLE: SampleRegion[] = [
  { slug: "banpo", level: 552000, peak: 0.74, trend: 0.86, complexes: ["반포 리버스위트", "반포 한강에비뉴", "잠원 센트럴하임"] },
  { slug: "daechi", level: 384000, peak: 0.86, trend: 0.92, complexes: ["대치 에듀팰리스", "도곡 파크힐스", "대치 센트럴원"] },
  { slug: "gaepo", level: 358000, peak: 0.84, trend: 0.97, complexes: ["개포 포레스트원", "일원 그린에비뉴", "개포 레이크뷰"] },
  { slug: "jamsil", level: 309000, peak: 0.9, trend: 0.88, complexes: ["잠실 리버하임", "잠실 파크에비뉴", "신천 센트럴뷰"] },
  { slug: "yongsan", level: 298000, peak: 0.85, trend: 0.95, complexes: ["이촌 한강스위트", "한남 힐스테라스", "서빙고 리버원"] },
  { slug: "seongsu", level: 281000, peak: 0.86, trend: 0.74, complexes: ["성수 리버포레", "성수 뚝섬하임", "성수 에비뉴원"] },
  { slug: "gwacheon", level: 223000, peak: 0.9, trend: 0.98, complexes: ["과천 센트럴포레", "과천 그린힐스", "별양 파크뷰"] },
  { slug: "mapo", level: 231000, peak: 0.96, trend: 0.95, complexes: ["마포 리버센트럴", "공덕 파크스위트", "아현 에비뉴힐"] },
  { slug: "mokdong", level: 219000, peak: 0.9, trend: 0.97, complexes: ["목동 센트럴파크", "신정 한빛하임", "목동 에듀스퀘어"] },
  { slug: "pangyo", level: 212000, peak: 0.95, trend: 0.99, complexes: ["판교 테크노하임", "백현 파크스위트", "삼평 리버뷰"] },
  { slug: "gangdong", level: 206000, peak: 0.95, trend: 0.92, complexes: ["둔촌 올림픽하임", "고덕 그린에비뉴", "상일 센트럴원"] },
  { slug: "magok", level: 171000, peak: 1.0, trend: 0.96, complexes: ["마곡 식물원하임", "마곡 센트럴에비뉴", "가양 리버뷰"] },
  { slug: "gwanggyo", level: 152000, peak: 1.1, trend: 1.02, complexes: ["광교 호수파크", "이의 센트럴하임", "광교 에듀원"] },
  { slug: "dongtan", level: 137000, peak: 1.12, trend: 0.84, complexes: ["동탄역 센트럴스위트", "동탄 호수공원하임", "동탄 레이크에비뉴"] },
  { slug: "pyeongchon", level: 131000, peak: 1.05, trend: 0.98, complexes: ["평촌 센트럴파크", "호계 그린하임", "평촌 에비뉴원"] },
  { slug: "gwangmyeong", level: 128000, peak: 1.06, trend: 0.95, complexes: ["광명 뉴타운센트럴", "철산 파크하임", "광명 리버에비뉴"] },
  { slug: "misa", level: 124000, peak: 1.06, trend: 0.97, complexes: ["미사 강변센트럴", "망월 리버하임", "풍산 파크뷰"] },
  { slug: "songdo", level: 104000, peak: 1.38, trend: 1.12, complexes: ["송도 센트럴오션", "송도 파크스위트", "송도 마린에비뉴"] },
  { slug: "nowon", level: 95500, peak: 1.18, trend: 1.01, complexes: ["상계 센트럴하임", "중계 에듀파크", "하계 그린뷰"] },
  { slug: "cheongna", level: 91000, peak: 1.27, trend: 1.04, complexes: ["청라 호수센트럴", "청라 커낼하임", "청라 파크에비뉴"] },
  { slug: "ilsan", level: 85000, peak: 1.22, trend: 1.03, complexes: ["일산 호수파크", "마두 센트럴하임", "주엽 그린에비뉴"] },
  { slug: "guwol", level: 79000, peak: 1.2, trend: 1.0, complexes: ["구월 센트럴시티", "간석 파크하임", "구월 에비뉴원"] },
  { slug: "geomdan", level: 61000, peak: 1.26, trend: 1.05, complexes: ["검단 호수하임", "검단 센트럴파크", "당하 리버뷰"] },
];

/** Market index relative to today (1.0) — rise to the 2021 peak, the 2022–23 slump, recovery at each region's pace. */
function curve(peak: number, trend = 0.95): Anchor[] {
  return [
    [202101, peak * 0.88],
    [202110, peak],
    [202206, peak * 0.97],
    [202301, peak * 0.76],
    [202406, (peak * 0.76 + trend) / 2],
    [202509, trend],
    [202609, 1.0],
  ];
}

function indexAt(anchors: Anchor[], ym: number): number {
  const monthIndex = (v: number) => Math.floor(v / 100) * 12 + (v % 100);
  const m = monthIndex(ym);
  for (let i = 1; i < anchors.length; i++) {
    const [a, va] = anchors[i - 1];
    const [b, vb] = anchors[i];
    if (m <= monthIndex(b)) {
      const f = (m - monthIndex(a)) / (monthIndex(b) - monthIndex(a));
      return va + (vb - va) * Math.max(0, Math.min(1, f));
    }
  }
  return anchors[anchors.length - 1][1];
}

// Deterministic pseudo-random (mulberry32) so every seed builds the same market.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthlyVolume(ym: number): number {
  const y = Math.floor(ym / 100);
  if (y === 2021) return 3;
  if (y === 2022) return 0.8;
  if (y === 2023) return 1.8;
  if (y === 2024) return 2.4;
  return 3;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@localhost[:/]/.test(url)) throw new Error(`Refusing to seed a non-local database: ${url.replace(/:[^:@/]+@/, ":***@")}`);

  const { REGIONS } = await import("@/data/regions");
  const { prisma } = await import("@/lib/db");
  const { runIngest } = await import("@/lib/ingest/run");
  const { monthsBetween } = await import("@/lib/molit/plan");
  type Raw = import("@/lib/molit/parse").RawTradeItem;

  await prisma.$executeRawUnsafe(
    'TRUNCATE "Trade", "Complex", "Edition", "IngestRun", "PendingFetch" RESTART IDENTITY CASCADE',
  );

  // Build the whole synthetic market, keyed by (code, month) like the real API.
  const byTarget = new Map<string, Raw[]>();
  const push = (code: string, ym: string, item: Raw) => {
    const key = `${code}:${ym}`;
    byTarget.set(key, [...(byTarget.get(key) ?? []), item]);
  };

  const random = rng(20260926);
  const LATE_FROM = "2026-09-21"; // trades "reported" only in today's run

  for (const [regionIndex, sample] of SAMPLE.entries()) {
    const region = REGIONS.find((r) => r.slug === sample.slug)!;
    const anchors = curve(sample.peak, sample.trend);
    sample.complexes.forEach((name, c) => {
      const aptSeq = `${region.districts.at(-1)!.code}-9${String(regionIndex).padStart(2, "0")}${c}`;
      const tier = c === 0 ? 1 : c === 1 ? 0.93 : 0.86;
      const buildYear = 2008 + ((regionIndex * 3 + c * 5) % 16);
      const jibun = String(100 + regionIndex * 7 + c);
      for (const ymText of monthsBetween("202101", "202609")) {
        const ym = Number(ymText);
        const expected = monthlyVolume(ym) * (c === 0 ? 1 : 0.7);
        const count = Math.floor(expected + random());
        for (let n = 0; n < count; n++) {
          const day = 1 + Math.floor(random() * 28);
          const dealDate = `${ymText.slice(0, 4)}-${ymText.slice(4)}-${String(day).padStart(2, "0")}`;
          if (dealDate > "2026-09-25") continue;
          const size = random();
          const area = size < 0.62 ? 84.97 : size < 0.86 ? 59.98 : 114.93;
          const floor = 1 + Math.floor(random() * 30);
          const floorFactor = floor <= 3 ? 0.94 : floor >= 20 ? 1.03 : 1;
          const areaFactor = area === 84.97 ? 1 : area === 59.98 ? 0.78 : 1.24;
          const noise = 1 + (random() - 0.5) * 0.05;
          let price = Math.round((sample.level * tier * indexAt(anchors, ym) * floorFactor * areaFactor * noise) / 100) * 100;
          const direct = random() < 0.05;
          if (direct) price = Math.round(price * 0.82 / 100) * 100;

          // Districts split mid-stream file under the code valid that month.
          const district =
            region.districts.find((d) => (!d.from || ymText >= d.from) && (!d.to || ymText <= d.to)) ?? region.districts[0];
          const dongName =
            region.slug === "dongtan" ? (ymText < "202602" ? "오산동" : "여울동") : region.dongs[sample.dong ?? 0];

          push(district.code, ymText, {
            aptDong: "",
            aptNm: name,
            aptSeq,
            buildYear: String(buildYear),
            buyerGbn: "개인",
            cdealDay: "",
            cdealType: "",
            dealAmount: price.toLocaleString("en-US"),
            dealDay: String(day),
            dealMonth: String(Number(ymText.slice(4))),
            dealYear: ymText.slice(0, 4),
            dealingGbn: direct ? "직거래" : "중개거래",
            excluUseAr: String(area),
            floor: String(floor),
            jibun,
            rgstDate: "",
            roadNm: "",
            sggCd: district.code,
            slerGbn: "개인",
            umdNm: dongName,
          });
        }
      }
    });
  }

  // Today's moves: a record in 잠실, 용산 climbing into master, busy 동탄, a cancelled record in 마포.
  const leaderItem = (slug: string, dealDate: string, price: number, floor: number, over: Partial<Raw> = {}): void => {
    const regionIndex = SAMPLE.findIndex((s) => s.slug === slug);
    const region = REGIONS.find((r) => r.slug === slug)!;
    const code = region.districts.at(-1)!.code;
    const ymText = dealDate.slice(0, 4) + dealDate.slice(5, 7);
    push(code, ymText, {
      aptDong: "",
      aptNm: SAMPLE[regionIndex].complexes[0],
      aptSeq: `${code}-9${String(regionIndex).padStart(2, "0")}0`,
      buildYear: String(2008 + ((regionIndex * 3) % 16)),
      buyerGbn: "개인",
      cdealDay: "",
      cdealType: "",
      dealAmount: price.toLocaleString("en-US"),
      dealDay: String(Number(dealDate.slice(8))),
      dealMonth: String(Number(dealDate.slice(5, 7))),
      dealYear: dealDate.slice(0, 4),
      dealingGbn: "중개거래",
      excluUseAr: "84.97",
      floor: String(floor),
      jibun: String(100 + regionIndex * 7),
      rgstDate: "",
      roadNm: "",
      sggCd: code,
      slerGbn: "개인",
      umdNm: slug === "dongtan" ? "여울동" : region.dongs[0],
      ...over,
    });
  };
  leaderItem("jamsil", "2026-09-23", 328000, 24);
  leaderItem("yongsan", "2026-09-22", 312000, 21);
  leaderItem("yongsan", "2026-09-24", 309000, 17);
  leaderItem("dongtan", "2026-09-22", 146500, 27);
  leaderItem("dongtan", "2026-09-24", 147000, 19);
  leaderItem("dongtan", "2026-09-25", 145800, 22);
  leaderItem("dongtan", "2026-09-23", 148200, 25);
  leaderItem("dongtan", "2026-09-21", 146900, 14);
  leaderItem("mapo", "2026-09-02", 262000, 21);

  const answer = (cutoff: string, cancelMapo: boolean) => async (t: { code: string; ym: string }) =>
    (byTarget.get(`${t.code}:${t.ym}`) ?? [])
      .filter((item) => {
        const date = `${item.dealYear}-${item.dealMonth.padStart(2, "0")}-${item.dealDay.padStart(2, "0")}`;
        return date <= cutoff || (date >= LATE_FROM && cutoff === "9999");
      })
      .map((item) =>
        cancelMapo && item.aptNm === "마포 리버센트럴" && item.dealAmount === "262,000"
          ? { ...item, cdealType: "O", cdealDay: "26.09.24" }
          : item,
      );

  const quiet = () => {};
  await runIngest(prisma, {
    kind: "backfill",
    regions: REGIONS,
    fromYm: "202101",
    toYm: "202609",
    asOf: "2026-09-25",
    fetcher: answer("2026-09-20", false),
    log: quiet,
  });
  const { edition } = await runIngest(prisma, {
    kind: "daily",
    regions: REGIONS,
    fromYm: "202607",
    toYm: "202609",
    asOf: "2026-09-26",
    fetcher: answer("9999", true),
    log: quiet,
  });

  const trades = await prisma.trade.count();
  console.log(`sample market: ${trades} trades, edition no. ${edition.number}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
