import { ImageResponse } from "next/og";
import { TIER_COLOR } from "@/lib/emblem/colors";
import { formatKoreanDate } from "@/lib/format/date";
import { formatTier } from "@/lib/format/tier";
import { CARD_SIZE, CardFrame, crestSrc, TEXT_2, TEXT_3 } from "@/lib/og/card";
import { cardFonts } from "@/lib/og/fonts";
import { getLatestEdition } from "@/lib/queries";
import { TIERS } from "@/lib/stats/tiers";

export const alt = "급지.gg — 수도권 대장아파트 티어";
export const size = CARD_SIZE;
export const contentType = "image/png";

const EOK = 10000;

export default async function Image() {
  const edition = await getLatestEdition();
  const sample = process.env.NEXT_PUBLIC_SAMPLE_DATA === "1";
  const ranked = (edition?.snapshots ?? []).filter((s) => s.standing).sort((a, b) => a.standing!.rank - b.standing!.rank);
  const top = ranked.slice(0, 3);
  const lead = top[0]?.standing?.tier.id ?? "challenger";
  const right = edition ? `${formatKoreanDate(edition.asOf)} 실거래 기준` : "";
  const title = "수도권 대장아파트 티어";
  const rows = top.map((s) => ({
    rank: String(s.standing!.rank),
    name: s.leader?.name ?? s.regionSlug,
    tier: formatTier(s.standing!),
    price: `${(s.rep!.priceManwon / EOK).toFixed(2)}억`,
  }));
  const counts = TIERS.map((t) => ({ tier: t, n: ranked.filter((s) => s.standing!.tier.id === t.id).length }));

  return new ImageResponse(
    (
      <CardFrame glow={TIER_COLOR[lead]} right={right} sample={sample}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", paddingTop: 22 }}>
          <div style={{ display: "flex", fontSize: 66, fontWeight: 800, letterSpacing: -2.5 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 34, marginTop: 18 }}>
            <img src={crestSrc(lead)} width={200} height={200} alt="" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rows.map((r) => (
                <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontFamily: "Barlow Condensed", fontSize: 36, color: TEXT_3, width: 24 }}>{r.rank}</span>
                  <span style={{ fontSize: 34, fontWeight: 800 }}>{r.name}</span>
                  <span style={{ fontSize: 24, fontWeight: 500, color: TEXT_2 }}>{r.tier}</span>
                  <span style={{ fontFamily: "Barlow Condensed", fontSize: 38 }}>{r.price}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: "auto" }}>
            {counts.map(({ tier, n }) => (
              <div key={tier.id} style={{ display: "flex", alignItems: "center", gap: 4, opacity: n ? 1 : 0.35 }}>
                <img src={crestSrc(tier.id)} width={46} height={46} alt="" />
                <span style={{ fontFamily: "Barlow Condensed", fontSize: 28, color: TEXT_2 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </CardFrame>
    ),
    {
      ...size,
      fonts: await cardFonts(`급지${title}${rows.map((r) => r.name).join("")}`, `${right}견본 데이터${rows.map((r) => r.tier).join("")}`, `.gg0123456789억${rows.map((r) => r.price).join("")}`),
    },
  );
}
