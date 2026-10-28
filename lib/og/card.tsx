import type { ReactNode } from "react";
import { brandFacets, crestFacets } from "@/lib/emblem/geometry";
import type { TierId } from "@/lib/stats/tiers";

/** Shared frame for share cards: Apple's dark showroom (flat black, no gradient). Inline styles only (Satori). */

export const CARD_SIZE = { width: 1200, height: 630 };

export const NIGHT = "#000000";
export const TEXT = "#f5f5f7";
export const TEXT_2 = "#c7c7cc";
export const TEXT_3 = "#98989d";
export const LINE = "#333336";
export const PANEL = "#1d1d1f";
const SAMPLE = "#f5c46b";

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
  right,
  sample,
  children,
}: {
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

        backgroundColor: NIGHT,
        padding: "48px 64px 44px",
        fontFamily: "Noto Sans KR",
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={crestSrc("brand")} width={44} height={44} alt="" />
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8 }}>급지</span>
          <span style={{ fontWeight: 800, fontSize: 34, color: TEXT_3, marginLeft: -10 }}>.gg</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, fontWeight: 500, color: TEXT_3 }}>
          {sample && (
            <span style={{ padding: "4px 16px", borderRadius: 999, background: PANEL, color: SAMPLE }}>견본 데이터</span>
          )}
          <span>{right}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexGrow: 1 }}>{children}</div>
    </div>
  );
}
