"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { TIER_COLOR } from "@/lib/emblem/colors";
import type { MapJump, MapRegion } from "./types";
import styles from "./MapView.module.css";

const NO_TIER = "#5c5c62";
/** 이 줌부터 지역 이름을 지도 위에 늘 띄운다 (멀리서는 겹쳐서). */
const LABEL_ZOOM = 11;

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자';
const GEO_ATTRIBUTION = '경계: 통계청 SGIS · <a href="https://github.com/vuski/admdongkor">admdongkor</a>';

interface Props {
  regions: MapRegion[];
  jumps: MapJump[];
  jump: { key: string; n: number };
  selected: string | null;
  onSelect: (slug: string | null) => void;
  onHover: (slug: string | null) => void;
}

interface RegionLayer {
  layer: L.Path;
  bounds: L.LatLngBounds;
  base: L.PathOptions;
}

export default function RegionMap({ regions, jumps, jump, selected, onSelect, onHover }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef(new Map<string, RegionLayer>());
  const latest = useRef({ onSelect, onHover, jumps, regions });
  useEffect(() => {
    latest.current = { onSelect, onHover, jumps, regions };
  });

  // 지도는 한 번만 만든다
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const store = layers.current;
    const m = L.map(el, { minZoom: 6, maxZoom: 15, zoomSnap: 0.25 });
    m.attributionControl.setPrefix(false);
    map.current = m;

    // 키 없는 OSM 기본 타일을 CSS로 어둡게 뒤집는다 (.leaflet-tile-pane 필터). CARTO는 2026년 현재 키를 요구한다.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(m);
    m.attributionControl.addAttribution(GEO_ATTRIBUTION);

    // 첫 화면: 수도권 대략 (경계가 오기 전에도 빈 바다가 보이지 않게)
    m.fitBounds([
      [37.2, 126.6],
      [37.75, 127.2],
    ]);

    const syncLabels = () => el.classList.toggle(styles.showLabels, m.getZoom() >= LABEL_ZOOM);
    m.on("zoomend", syncLabels);
    m.on("click", () => latest.current.onSelect(null));
    syncLabels();

    const bySlug = new Map(latest.current.regions.map((r) => [r.slug, r]));
    let cancelled = false;

    fetch("/geo/regions.geojson")
      .then((res) => res.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        if (cancelled) return;
        for (const f of geo.features) {
          const slug = (f.properties as { slug: string }).slug;
          const region = bySlug.get(slug);
          if (!region) continue;
          const color = region.tier ? TIER_COLOR[region.tier] : NO_TIER;
          const base: L.PathOptions = { color, weight: 1.5, opacity: 0.95, fillColor: color, fillOpacity: 0.42 };
          let layer: L.Path;
          let bounds: L.LatLngBounds;
          if (f.geometry.type === "Point") {
            const [lng, lat] = f.geometry.coordinates as [number, number];
            const dot = L.circleMarker([lat, lng], { ...base, radius: 10, fillOpacity: 0.7 });
            layer = dot;
            bounds = L.latLngBounds([lat - 0.02, lng - 0.02], [lat + 0.02, lng + 0.02]);
          } else {
            const poly = L.geoJSON(f, { style: () => base }).getLayers()[0] as L.Polygon;
            layer = poly;
            bounds = poly.getBounds();
          }
          layer.bindTooltip(region.name, { permanent: true, direction: "center", className: styles.regionLabel });
          layer.on("mouseover", () => latest.current.onHover(slug));
          layer.on("mouseout", () => latest.current.onHover(null));
          layer.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            latest.current.onSelect(slug);
          });
          layer.addTo(m);
          store.set(slug, { layer, bounds, base });
        }
        el.dataset.painted = String(store.size);
        fitTo(m, latest.current.jumps[0].slugs, store);
      })
      .catch(() => {
        el.dataset.painted = "error";
      });

    return () => {
      cancelled = true;
      store.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  // 바로가기 버튼
  useEffect(() => {
    if (!map.current || jump.n === 0) return;
    const target = jumps.find((j) => j.key === jump.key);
    if (target) fitTo(map.current, target.slugs, layers.current);
  }, [jump, jumps]);

  // 고른 지역 테두리 강조
  useEffect(() => {
    for (const [slug, { layer, base }] of layers.current) {
      const on = slug === selected;
      layer.setStyle(on ? { ...base, weight: 3.5, color: "#ffffff", fillOpacity: 0.62 } : base);
      if (on) layer.bringToFront();
    }
  }, [selected]);

  return <div ref={box} className={styles.leaflet} data-painted="0" />;
}

function fitTo(m: L.Map, slugs: string[], layers: Map<string, RegionLayer>) {
  let bounds: L.LatLngBounds | null = null;
  for (const slug of slugs) {
    const l = layers.get(slug);
    if (!l) continue;
    bounds = bounds ? bounds.extend(l.bounds) : L.latLngBounds(l.bounds.getSouthWest(), l.bounds.getNorthEast());
  }
  if (bounds) m.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
}
