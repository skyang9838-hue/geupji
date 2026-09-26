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
  sido: "서울" | "경기" | "인천";
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
  },
  {
    slug: "ilsan",
    name: "일산",
    area: "고양 일산동구·서구",
    sido: "경기",
    districts: [{ code: "41285" }, { code: "41287" }],
    dongs: ["장항동", "마두동", "백석동", "정발산동", "주엽동", "대화동", "일산동", "탄현동"],
  },

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
  { slug: "guwol", name: "구월", area: "인천 남동구", sido: "인천", districts: [{ code: "28200" }], dongs: ["구월동", "간석동"] },
];

export function regionBySlug(slug: string): RegionDef | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
