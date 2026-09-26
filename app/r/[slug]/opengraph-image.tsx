import { ImageResponse } from "next/og";
import { REGIONS, regionBySlug } from "@/data/regions";
import { TIER_COLOR } from "@/lib/emblem/colors";
import { formatKoreanDate } from "@/lib/format/date";
import { formatLp, formatTier } from "@/lib/format/tier";
import { CARD_SIZE, CardFrame, crestSrc, TEXT_2, TEXT_3 } from "@/lib/og/card";
import { cardFonts } from "@/lib/og/fonts";
import { getLatestEdition } from "@/lib/queries";

export const alt = "급지.gg 단지 랭크 카드";
export const size = CARD_SIZE;
export const contentType = "image/png";

const EOK = 10000;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  const edition = await getLatestEdition();
  const snap = edition?.snapshots.find((s) => s.regionSlug === slug);
  const st = snap?.standing;
  const sample = process.env.NEXT_PUBLIC_SAMPLE_DATA === "1";
  const total = edition?.snapshots.filter((s) => s.standing).length ?? 0;

  const place = `${region?.name ?? slug} · ${region?.area ?? ""}`;
  const name = snap?.leader?.name ?? region?.name ?? slug;
  const tierLine = st ? `${formatTier(st)} · ${formatLp(st)}` : "티어 미정";
  const rankLine = st ? `#${st.rank} / ${total}` : "";
  const price = snap?.rep ? (snap.rep.priceManwon / EOK).toFixed(2) : "—";
  const right = edition ? `${formatKoreanDate(edition.asOf)} 실거래 기준` : "";
  const tier = st?.tier.id ?? "iron";

  return new ImageResponse(
    (
      <CardFrame glow={TIER_COLOR[tier]} right={right} sample={sample}>
        <div style={{ display: "flex", alignItems: "center", gap: 44, width: "100%" }}>
          <img src={crestSrc(tier)} width={330} height={330} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 26, fontWeight: 500, color: TEXT_3 }}>{place}</span>
            <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, marginTop: 4 }}>{name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  padding: "4px 16px",
                  borderRadius: 999,
                  background: `${TIER_COLOR[tier]}33`,
                }}
              >
                {tierLine}
              </span>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: 32, color: TEXT_2 }}>{rankLine}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 22 }}>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: 120, lineHeight: 1 }}>{price}</span>
              <span style={{ fontSize: 36, fontWeight: 500, color: TEXT_2, marginLeft: 6 }}>억</span>
              <span style={{ fontSize: 24, fontWeight: 500, color: TEXT_3, marginLeft: 18 }}>84㎡ 대표가</span>
            </div>
          </div>
        </div>
      </CardFrame>
    ),
    {
      ...size,
      fonts: await cardFonts(`급지${name}${tierLine}`, `${place}${right}견본 데이터억84㎡ 대표가`, `.gg#/0123456789${rankLine}${price}${tierLine}`),
    },
  );
}
