/**
 * 지도 페이지(/map)가 쓰는 지역 경계를 만든다.
 * 원본: vuski/admdongkor 행정동 경계 (통계청 SGIS 공공누리 1유형 → CC BY 4.0).
 * 51개 지역에 드는 행정동만 골라 지역마다 하나로 합치고(union) 줄여서 public/geo/regions.geojson에 쓴다.
 *
 *   curl -L -o <임시폴더>/HangJeongDong_ver20261001.geojson \
 *     https://raw.githubusercontent.com/vuski/admdongkor/master/ver20261001/HangJeongDong_ver20261001.geojson
 *   npx tsx scripts/build-region-geo.ts <임시폴더>/HangJeongDong_ver20261001.geojson
 *
 * 어느 지역이 어느 행정동으로 이뤄졌는지는 출력 표와 각 지역의 properties.adm에 남는다.
 * 행정동으로 못 맞춘 지역은 properties.fallback = true인 점(Point, 그 시군구 중심)으로 들어간다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import polygonClipping, { type MultiPolygon as PcMulti } from "polygon-clipping";
import { ADM_ALIASES } from "@/data/geo/aliases";
import { REGIONS } from "@/data/regions";
import { matchRegions, type AdmDong } from "@/lib/geo/match";
import { centroid, simplifyMultiPolygon, type Polygon } from "@/lib/geo/simplify";

const SOURCE_VERSION = "ver20261001";
/** 약 25m. 지도는 시·구 단위로 보니 이 정도면 모양이 남는다. */
const TOLERANCE = 0.00025;

interface RawFeature {
  properties: { adm_nm: string; adm_cd2: string; sgg: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
}

function asMulti(g: RawFeature["geometry"]): Polygon[] {
  return (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Polygon[];
}

function main() {
  const src = process.argv[2];
  if (!src) throw new Error("원본 geojson 경로를 넘겨 주세요 (맨 위 주석 참고).");
  const raw = JSON.parse(readFileSync(src, "utf8")) as { features: RawFeature[] };

  const byCode = new Map<string, RawFeature>();
  const adms: AdmDong[] = raw.features.map((f) => {
    byCode.set(f.properties.adm_cd2, f);
    return { code: f.properties.adm_cd2, sgg: f.properties.sgg, name: f.properties.adm_nm.split(" ").pop()! };
  });

  const matched = matchRegions(REGIONS, adms, ADM_ALIASES);
  const features: object[] = [];
  const missing: string[] = [];

  for (const region of REGIONS) {
    const list = matched.get(region.slug)!;
    if (list.length === 0) {
      // 점으로 대신: 그 지역 시군구 전체의 중심
      const district = adms.filter((a) => region.districts.some((d) => d.code === a.sgg));
      const c = centroid(district.flatMap((a) => asMulti(byCode.get(a.code)!.geometry)));
      missing.push(region.name);
      if (c) {
        features.push({
          type: "Feature",
          properties: { slug: region.slug, adm: [], fallback: true },
          geometry: { type: "Point", coordinates: c.map((v) => Math.round(v * 1e5) / 1e5) },
        });
      }
      console.log(`${region.name.padEnd(6)} ✗ 행정동 없음 → 점`);
      continue;
    }
    const parts = list.map((a) => asMulti(byCode.get(a.code)!.geometry) as PcMulti);
    const merged = polygonClipping.union(parts[0], ...parts.slice(1)) as Polygon[];
    const shape = simplifyMultiPolygon(merged, TOLERANCE);
    features.push({
      type: "Feature",
      properties: { slug: region.slug, adm: list.map((a) => a.name) },
      geometry: { type: "MultiPolygon", coordinates: shape },
    });
    console.log(`${region.name.padEnd(6)} ${list.length}곳: ${list.map((a) => a.name).join(" ")}`);
  }

  const out = {
    type: "FeatureCollection",
    source: `vuski/admdongkor ${SOURCE_VERSION} (통계청 SGIS 행정동 경계, 공공누리 제1유형 · 가공 CC BY 4.0)`,
    features,
  };
  const dest = path.join("public", "geo", "regions.geojson");
  writeFileSync(dest, JSON.stringify(out));
  const kb = Math.round(Buffer.byteLength(JSON.stringify(out)) / 1024);
  console.log(`\n${dest} · ${features.length}곳 · ${kb}KB · 경계 ${REGIONS.length - missing.length}/${REGIONS.length}`);
  if (missing.length) console.log(`점으로 대신: ${missing.join(", ")}`);
}

main();
