import type { DistrictCode, RegionDef } from "@/data/regions";

export interface FetchTarget {
  /** LAWD_CD */
  code: string;
  /** DEAL_YMD, `YYYYMM` */
  ym: string;
}

export function monthsBetween(fromYm: string, toYm: string): string[] {
  const months: string[] = [];
  let y = Number(fromYm.slice(0, 4));
  let m = Number(fromYm.slice(4, 6));
  const end = Number(toYm);
  while (y * 100 + m <= end) {
    months.push(`${y}${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export function shiftMonth(ym: string, delta: number): string {
  const index = Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(4, 6)) - 1) + delta;
  return `${Math.floor(index / 12)}${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * Every (code, month) to request for the regions over `fromYm..toYm`.
 * Around a district split, both codes are asked for `overlapMonths` extra
 * months: a deal signed before the switch may be filed after it.
 */
export function fetchPlan(
  regions: RegionDef[],
  fromYm: string,
  toYm: string,
  { overlapMonths = 2 }: { overlapMonths?: number } = {},
): FetchTarget[] {
  const seen = new Set<string>();
  const plan: FetchTarget[] = [];
  for (const ym of monthsBetween(fromYm, toYm)) {
    const codes = new Set<string>();
    for (const region of regions) {
      for (const district of region.districts) {
        if (covers(district, ym, overlapMonths)) codes.add(district.code);
      }
    }
    for (const code of [...codes].sort()) {
      const key = `${code}:${ym}`;
      if (seen.has(key)) continue;
      seen.add(key);
      plan.push({ code, ym });
    }
  }
  return plan;
}

function covers(district: DistrictCode, ym: string, overlap: number): boolean {
  const from = district.from ? shiftMonth(district.from, -overlap) : undefined;
  const to = district.to ? shiftMonth(district.to, overlap) : undefined;
  return (!from || ym >= from) && (!to || ym <= to);
}
