import type { TierId } from "@/lib/stats/tiers";

/** 지도에 칠할 지역 하나. 계산은 판 스냅숏에서 끝났고 여기는 보여 줄 글자만. */
export interface MapRegion {
  slug: string;
  name: string;
  area: string;
  sido: string;
  /** 판에 순위가 없으면 null (대표가 없음) */
  tier: TierId | null;
  tierLabel: string | null;
  geupji: string | null;
  rank: number | null;
  priceEok: string | null;
  leaderName: string | null;
}

/** 첫 화면·바로가기 묶음 */
export interface MapJump {
  key: string;
  label: string;
  slugs: string[];
}
