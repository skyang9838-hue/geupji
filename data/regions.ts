import type { SizeBand } from "@/lib/stats/representative";

/**
 * A LAWD_CD (시군구 5자리) valid for a span of contract months, both ends
 * inclusive (`YYYYMM`). Districts that were split or renamed get one entry
 * per code so each month is fetched under the code MOLIT files it under.
 */
export interface DistrictCode {
  code: string;
  from?: string;
  to?: string;
}

export interface RegionDef {
  /** URL segment, e.g. /r/jamsil */
  slug: string;
  /** Display name, e.g. 잠실 */
  name: string;
  /** Where it is, for the kicker line: "서울 송파구" */
  area: string;
  sido: "서울" | "경기" | "인천" | "대전" | "대구" | "부산";
  districts: DistrictCode[];
  /** 법정동 names that make up the region. Old names stay listed so history still matches. */
  dongs: string[];
  /** Confirmed leader (checkpoint 1). Until then the top contender leads. */
  leaderAptSeq?: string;
  /** Size band for a region whose leader has no 84㎡ units. */
  band?: SizeBand;
}

// Codes and 동 names checked against 국토교통부_전국_법정동_20260729.csv.
// - 화성시(41590) split into 4 구 on 2026-02-01; 동탄 is 동탄구 41597.
//   Its 오산동 was renamed 여울동 at the same time (the 동탄역 area).
// - 인천 서구(28260) was abolished on 2026-07-01: 청라 → 서해구 28275, 검단 → 검단구 28290.
export const REGIONS: RegionDef[] = [
  // ── 서울 ───────────────────────────────────────────
  { slug: "banpo", name: "반포", area: "서울 서초구", sido: "서울", districts: [{ code: "11650" }], dongs: ["반포동", "잠원동"] },
  { slug: "daechi", name: "대치", area: "서울 강남구", sido: "서울", districts: [{ code: "11680" }], dongs: ["대치동", "도곡동"] },
  { slug: "gaepo", name: "개포", area: "서울 강남구", sido: "서울", districts: [{ code: "11680" }], dongs: ["개포동", "일원동"] },
  { slug: "jamsil", name: "잠실", area: "서울 송파구", sido: "서울", districts: [{ code: "11710" }], dongs: ["잠실동", "신천동"] },
  { slug: "seongsu", name: "성수", area: "서울 성동구", sido: "서울", districts: [{ code: "11200" }], dongs: ["성수동1가", "성수동2가"] },
  {
    slug: "yongsan",
    name: "용산",
    area: "서울 용산구",
    sido: "서울",
    districts: [{ code: "11170" }],
    dongs: ["이촌동", "한남동", "서빙고동", "동빙고동", "한강로1가", "한강로2가", "한강로3가"],
  },
  {
    slug: "mapo",
    name: "마포",
    area: "서울 마포구",
    sido: "서울",
    districts: [{ code: "11440" }],
    dongs: ["아현동", "공덕동", "신공덕동", "염리동", "대흥동", "용강동", "도화동", "마포동"],
  },
  { slug: "mokdong", name: "목동", area: "서울 양천구", sido: "서울", districts: [{ code: "11470" }], dongs: ["목동", "신정동"] },
  {
    slug: "gangdong",
    name: "강동",
    area: "서울 강동구",
    sido: "서울",
    districts: [{ code: "11740" }],
    dongs: ["둔촌동", "고덕동", "상일동", "강일동", "명일동"],
  },
  { slug: "magok", name: "마곡", area: "서울 강서구", sido: "서울", districts: [{ code: "11500" }], dongs: ["마곡동", "가양동", "내발산동"] },
  { slug: "nowon", name: "노원", area: "서울 노원구", sido: "서울", districts: [{ code: "11350" }], dongs: ["상계동", "중계동", "하계동"] },
  { slug: "dobong", name: "도봉", area: "서울 도봉구", sido: "서울", districts: [{ code: "11320" }], dongs: ["창동", "쌍문동", "방학동", "도봉동"] },
  { slug: "gangbuk", name: "강북", area: "서울 강북구", sido: "서울", districts: [{ code: "11305" }], dongs: ["미아동", "번동", "수유동", "우이동"] },

  // ── 경기 ───────────────────────────────────────────
  {
    slug: "bundang",
    name: "분당",
    area: "성남 분당구",
    sido: "경기",
    districts: [{ code: "41135" }],
    dongs: ["정자동", "수내동", "서현동", "이매동", "야탑동", "금곡동", "구미동", "분당동"],
  },
  { slug: "pangyo", name: "판교", area: "성남 분당구", sido: "경기", districts: [{ code: "41135" }], dongs: ["삼평동", "백현동", "판교동", "운중동"] },
  {
    slug: "gwacheon",
    name: "과천",
    area: "과천시",
    sido: "경기",
    districts: [{ code: "41290" }],
    dongs: ["원문동", "별양동", "중앙동", "부림동", "갈현동", "문원동", "주암동", "과천동"],
  },
  { slug: "gwanggyo", name: "광교", area: "수원 영통구", sido: "경기", districts: [{ code: "41117" }], dongs: ["이의동", "하동", "원천동"] },
  { slug: "yeongtong", name: "영통", area: "수원 영통구", sido: "경기", districts: [{ code: "41117" }], dongs: ["영통동", "매탄동", "망포동"] },
  { slug: "suji", name: "수지", area: "용인 수지구", sido: "경기", districts: [{ code: "41465" }], dongs: ["풍덕천동", "성복동", "상현동", "신봉동", "동천동"] },
  {
    slug: "jukjeon",
    name: "죽전",
    area: "용인 수지구·기흥구",
    sido: "경기",
    districts: [{ code: "41465" }, { code: "41463" }],
    dongs: ["죽전동", "보정동"],
  },
  { slug: "pyeongchon", name: "평촌", area: "안양 동안구", sido: "경기", districts: [{ code: "41173" }], dongs: ["평촌동", "호계동", "비산동", "관양동"] },
  { slug: "gwangmyeong", name: "광명", area: "광명시", sido: "경기", districts: [{ code: "41210" }], dongs: ["광명동", "철산동", "하안동", "소하동"] },
  { slug: "misa", name: "미사", area: "하남시", sido: "경기", districts: [{ code: "41450" }], dongs: ["망월동", "풍산동", "선동", "미사동"] },
  {
    slug: "dongtan",
    name: "동탄",
    area: "화성 동탄구",
    sido: "경기",
    districts: [
      { code: "41590", to: "202601" },
      { code: "41597", from: "202602" },
    ],
    dongs: [
      "여울동",
      "오산동",
      "청계동",
      "영천동",
      "산척동",
      "목동",
      "송동",
      "방교동",
      "장지동",
      "중동",
      "신동",
      "능동",
      "반송동",
      "석우동",
      "금곡동",
    ],
    leaderAptSeq: "41590-2074",
  },
  {
    slug: "ilsan",
    name: "일산",
    area: "고양 일산동구·서구",
    sido: "경기",
    districts: [{ code: "41285" }, { code: "41287" }],
    dongs: ["장항동", "마두동", "백석동", "정발산동", "주엽동", "대화동", "일산동", "탄현동"],
  },
  // 2026-11-06 추가: 빈 티어(실버·브론즈·아이언)를 채우려고
  {
    slug: "samsong",
    name: "삼송",
    area: "고양 덕양구",
    sido: "경기",
    districts: [{ code: "41281" }],
    dongs: ["삼송동", "동산동", "지축동", "원흥동", "향동동"],
  },
  { slug: "guri", name: "구리", area: "구리시", sido: "경기", districts: [{ code: "41310" }], dongs: ["인창동", "수택동", "교문동", "갈매동"] },
  { slug: "dasan", name: "다산", area: "남양주시", sido: "경기", districts: [{ code: "41360" }], dongs: ["다산동"] },
  { slug: "byeollae", name: "별내", area: "남양주시", sido: "경기", districts: [{ code: "41360" }], dongs: ["별내동"] },
  { slug: "giheung", name: "기흥역", area: "용인 기흥구", sido: "경기", districts: [{ code: "41463" }], dongs: ["구갈동", "신갈동", "중동", "영덕동"] },
  { slug: "hwajeong", name: "화정", area: "고양 덕양구", sido: "경기", districts: [{ code: "41281" }], dongs: ["화정동", "행신동"] },
  {
    slug: "uiwang",
    name: "의왕",
    area: "의왕시",
    sido: "경기",
    districts: [{ code: "41430" }],
    dongs: ["포일동", "내손동", "학의동", "오전동"],
  },
  { slug: "jangan", name: "수원 장안", area: "수원 장안구", sido: "경기", districts: [{ code: "41111" }], dongs: ["정자동", "천천동", "조원동"] },
  { slug: "gwonseon", name: "수원 권선", area: "수원 권선구", sido: "경기", districts: [{ code: "41113" }], dongs: ["권선동", "세류동", "호매실동", "금곡동"] },
  { slug: "ansan", name: "안산", area: "안산 단원구", sido: "경기", districts: [{ code: "41273" }], dongs: ["고잔동", "초지동"] },
  { slug: "anyang", name: "안양 만안", area: "안양 만안구", sido: "경기", districts: [{ code: "41171" }], dongs: ["안양동", "석수동", "박달동"] },
  { slug: "sanbon", name: "산본", area: "군포시", sido: "경기", districts: [{ code: "41410" }], dongs: ["산본동", "금정동"] },
  {
    slug: "unjeong",
    name: "운정",
    area: "파주시",
    sido: "경기",
    districts: [{ code: "41480" }],
    dongs: ["와동동", "목동동", "야당동", "동패동", "다율동", "당하동"],
  },
  { slug: "gimpo", name: "김포 한강", area: "김포시", sido: "경기", districts: [{ code: "41570" }], dongs: ["장기동", "구래동", "마산동", "운양동"] },
  { slug: "godeok", name: "고덕", area: "평택시", sido: "경기", districts: [{ code: "41220" }], dongs: ["고덕동"] },
  { slug: "baegot", name: "배곧", area: "시흥시", sido: "경기", districts: [{ code: "41390" }], dongs: ["배곧동"] },
  { slug: "uijeongbu", name: "의정부", area: "의정부시", sido: "경기", districts: [{ code: "41150" }], dongs: ["의정부동", "민락동", "금오동", "용현동"] },
  { slug: "okjeong", name: "옥정", area: "양주시", sido: "경기", districts: [{ code: "41630" }], dongs: ["옥정동", "회천동"] },

  // ── 인천 ───────────────────────────────────────────
  { slug: "songdo", name: "송도", area: "인천 연수구", sido: "인천", districts: [{ code: "28185" }], dongs: ["송도동"] },
  {
    slug: "cheongna",
    name: "청라",
    area: "인천 서해구",
    sido: "인천",
    districts: [
      { code: "28260", to: "202606" },
      { code: "28275", from: "202607" },
    ],
    dongs: ["청라동", "경서동", "연희동"],
  },
  {
    slug: "geomdan",
    name: "검단",
    area: "인천 검단구",
    sido: "인천",
    districts: [
      { code: "28260", to: "202606" },
      { code: "28290", from: "202607" },
    ],
    dongs: ["당하동", "원당동", "마전동", "불로동", "오류동", "왕길동", "백석동"],
  },
  { slug: "jakjeon", name: "작전", area: "인천 계양구", sido: "인천", districts: [{ code: "28245" }], dongs: ["작전동", "서운동"] },
  { slug: "bupyeong", name: "부평", area: "인천 부평구", sido: "인천", districts: [{ code: "28237" }], dongs: ["부평동", "산곡동", "청천동", "십정동"] },

  // ── 지방 (사용자 2026-11-06: 대전·대구 수성·부산 해운대만) ──
  {
    slug: "daejeon",
    name: "대전",
    area: "대전 유성구·서구",
    sido: "대전",
    districts: [{ code: "30200" }, { code: "30170" }],
    dongs: ["도룡동", "둔산동"],
  },
  { slug: "suseong", name: "수성", area: "대구 수성구", sido: "대구", districts: [{ code: "27260" }], dongs: ["범어동", "만촌동", "황금동", "수성동1가", "수성동2가", "수성동3가", "수성동4가"] },
  { slug: "haeundae", name: "해운대", area: "부산 해운대구", sido: "부산", districts: [{ code: "26350" }], dongs: ["우동", "중동", "좌동", "재송동"] },
];

/**
 * Challenger regions, picked by hand: challenger whatever their price.
 * 2026-11-06 사용자: 강남 3구로 시작했다가 잠실을 내리고 성수(트리마제)를 올림.
 */
export const CHALLENGER_SLUGS = ["banpo", "daechi", "gaepo", "seongsu"] as const;

export function isChallengerRegion(region: RegionDef): boolean {
  return (CHALLENGER_SLUGS as readonly string[]).includes(region.slug);
}

/** "반포·대치·개포·성수" for the rule text. */
export const CHALLENGER_NAMES = CHALLENGER_SLUGS.map((s) => regionBySlug(s)!.name).join("·");

/**
 * The area line without repeating the region's own name:
 * 대전 + "대전 유성구·서구" → "유성구·서구". Others stay as they are.
 */
export function areaLabel(region: RegionDef): string {
  const prefix = `${region.name} `;
  return region.area.startsWith(prefix) ? region.area.slice(prefix.length) : region.area;
}

export function regionBySlug(slug: string): RegionDef | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
