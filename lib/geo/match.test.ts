import { describe, expect, it } from "vitest";
import { admBelongs, dongStem, matchRegions, type AdmDong } from "./match";

const adm = (sgg: string, name: string, n = 0): AdmDong => ({ code: `${sgg}${String(n).padStart(5, "0")}`, sgg, name });

describe("dongStem", () => {
  it.each([
    ["반포1동", "반포"],
    ["반포본동", "반포"],
    ["반포동", "반포"],
    ["성수1가1동", "성수"],
    ["성수동1가", "성수"],
    ["상일제2동", "상일"],
    ["상계3·4동", "상계"],
    ["수성2·3가동", "수성"],
    ["수성동4가", "수성"],
    ["한강로동", "한강로"],
    ["한강로1가", "한강로"],
    ["목1동", "목"],
    ["목동", "목"],
    ["작전서운동", "작전서운"],
  ])("%s → %s", (name, stem) => expect(dongStem(name)).toBe(stem));
});

describe("admBelongs", () => {
  const banpo = { slug: "banpo", districts: [{ code: "11650" }], dongs: ["반포동", "잠원동"] };
  const jakjeon = { slug: "jakjeon", districts: [{ code: "28245" }], dongs: ["작전동", "서운동"] };
  const godeok = { slug: "godeok", districts: [{ code: "41220" }], dongs: ["고덕동"] };

  it("앞머리가 같으면 든다", () => {
    expect(admBelongs(adm("11650", "반포4동"), banpo)).toBe(true);
    expect(admBelongs(adm("11650", "잠원동"), banpo)).toBe(true);
    expect(admBelongs(adm("11650", "방배1동"), banpo)).toBe(false);
  });

  it("시군구가 다르면 이름이 같아도 안 든다", () => {
    expect(admBelongs(adm("11680", "반포1동"), banpo)).toBe(false);
  });

  it("묶인 행정동은 두 글자 앞머리로 시작하면 든다", () => {
    expect(admBelongs(adm("28245", "작전서운동"), jakjeon)).toBe(true);
  });

  it("읍·면은 건너뛴다 (고덕면 ≠ 고덕동)", () => {
    expect(admBelongs(adm("41220", "고덕면"), godeok)).toBe(false);
    expect(admBelongs(adm("41220", "고덕동"), godeok)).toBe(true);
  });

  it("한 글자 앞머리는 같을 때만 (우동 ↛ 우장산동)", () => {
    const r = { slug: "x", districts: [{ code: "1" }], dongs: ["우동"] };
    expect(admBelongs(adm("1", "우1동"), r)).toBe(true);
    expect(admBelongs(adm("1", "우장산동"), r)).toBe(false);
  });

  it("별칭으로 이름이 다른 신도시 행정동을 잡는다", () => {
    const dongtan = { slug: "dongtan", districts: [{ code: "41597" }], dongs: ["여울동", "오산동"] };
    expect(admBelongs(adm("41597", "동탄3동"), dongtan)).toBe(false);
    expect(admBelongs(adm("41597", "동탄3동"), dongtan, ["동탄"])).toBe(true);
  });
});

describe("matchRegions", () => {
  it("한 행정동은 먼저 맞은 지역 하나에만 든다", () => {
    const a = { slug: "a", districts: [{ code: "1" }], dongs: ["정자동"] };
    const b = { slug: "b", districts: [{ code: "1" }], dongs: ["정자동", "수내동"] };
    const out = matchRegions([a, b], [adm("1", "정자1동", 1), adm("1", "수내1동", 2)]);
    expect(out.get("a")!.map((d) => d.name)).toEqual(["정자1동"]);
    expect(out.get("b")!.map((d) => d.name)).toEqual(["수내1동"]);
  });

  it("못 맞춘 지역은 빈 목록", () => {
    const a = { slug: "a", districts: [{ code: "1" }], dongs: ["도룡동"] };
    expect(matchRegions([a], [adm("1", "신성동")]).get("a")).toEqual([]);
  });
});
