import type { ReactNode } from "react";
import { brandFacets, crestFacets } from "@/lib/emblem/geometry";
import type { TierId } from "@/lib/stats/tiers";

/** Shared frame for share cards, in the site's night palette. Inline styles only (Satori). */

export const CARD_SIZE = { width: 1200, height: 630 };

export const NIGHT = "#0b0f19";
export const TEXT = "#e8ecf4";
export const TEXT_2 = "#a6b0c4";
export const TEXT_3 = "#7d889e";
export const LINE = "#222b3d";

/** A crest as an <img> data URI; Satori draws SVG images more faithfully than inline SVG. */
export function crestSrc(tier: TierId | "brand"): string {
  const facets = tier === "brand" ? brandFacets() : crestFacets(tier);
  const body = facets
    .map((f) => `<polygon points="${f.points}" fill="${f.fill}"${f.opacity ? ` opacity="${f.opacity}"` : ""}/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">${body}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function CardFrame({
  glow,
  right,
  sample,
  children,
}: {
  glow: string;
  right: string;
  sample: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `radial-gradient(circle at 18% 46%, ${glow}24 0%, ${NIGHT} 46%)`,
        backgroundColor: NIGHT,
        padding: "44px 60px 40px",
        fontFamily: "Noto Sans KR",
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={crestSrc("brand")} width={40} height={40} alt="" />
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>급지</span>
          <span style={{ fontFamily: "Barlow Condensed", fontSize: 30, color: TEXT_3, marginLeft: -6 }}>.gg</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, fontWeight: 500, color: TEXT_3 }}>
          {sample && (
            <span style={{ padding: "2px 10px", borderRadius: 6, background: "#2a2112", color: "#f5c46b" }}>견본 데이터</span>
          )}
          <span>{right}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexGrow: 1 }}>{children}</div>
    </div>
  );
}
