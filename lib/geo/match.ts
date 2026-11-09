/**
 * 법정동 이름(지역 정의)과 행정동 경계(admdongkor)를 맞춘다.
 * 행정동은 법정동을 쪼개거나(반포1·2·3·4동) 묶거나(작전서운동) 번호를 붙이므로,
 * 둘 다 "앞머리"로 줄여서 비교한다.
 */

/**
 * "반포1동" → "반포", "성수1가1동" → "성수", "성수동1가" → "성수", "상일제2동" → "상일",
 * "상계3·4동" → "상계", "반포본동" → "반포", "한강로1가" → "한강로".
 */
export function dongStem(name: string): string {
  let s = name.trim();
  s = s.replace(/동$/, "");
  s = s.replace(/제?[\d·]+$/, "");
  s = s.replace(/본$/, "");
  s = s.replace(/[\d·]+가$/, "");
  s = s.replace(/동$/, "");
  return s;
}

/** 행정동 하나: 행안부 시군구 코드(앞 5자리)와 맨 끝 이름. */
export interface AdmDong {
  /** 행정기관코드 10자리 (adm_cd2) */
  code: string;
  sgg: string;
  name: string;
}

export interface RegionKey {
  slug: string;
  districts: { code: string }[];
  dongs: string[];
}

/**
 * 행정동 앞머리가 지역 법정동 앞머리(또는 별칭)와 같거나, 두 글자 이상 앞머리로 시작하면 그 지역이다
 * (작전서운동 ⊃ 작전, 불로대곡동 ⊃ 불로). 한 글자 앞머리(우동·중동·목동)는 같을 때만.
 * 읍·면은 신도시 동이 아니라서 건너뛴다.
 */
export function admBelongs(adm: AdmDong, region: RegionKey, aliases: string[] = []): boolean {
  if (!adm.name.endsWith("동")) return false;
  if (!region.districts.some((d) => d.code === adm.sgg)) return false;
  const stem = dongStem(adm.name);
  const keys = [...region.dongs.map(dongStem), ...aliases];
  return keys.some((k) => k === stem || (k.length >= 2 && stem.startsWith(k)));
}

/**
 * 지역마다 그 지역에 드는 행정동. 한 행정동은 먼저 맞은 한 지역에만 든다 (지역 순서 = REGIONS 순서).
 */
export function matchRegions(
  regions: RegionKey[],
  adms: AdmDong[],
  aliases: Record<string, string[]> = {},
): Map<string, AdmDong[]> {
  const out = new Map<string, AdmDong[]>(regions.map((r) => [r.slug, []]));
  const taken = new Set<string>();
  for (const region of regions) {
    for (const adm of adms) {
      if (taken.has(adm.code)) continue;
      if (admBelongs(adm, region, aliases[region.slug])) {
        out.get(region.slug)!.push(adm);
        taken.add(adm.code);
      }
    }
  }
  return out;
}
