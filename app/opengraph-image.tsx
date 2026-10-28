import { ImageResponse } from "next/og";
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
      <CardFrame right={right} sample={sample}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", paddingTop: 24 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, letterSpacing: -2.2, lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 18 }}>
            <img src={crestSrc(lead)} width={216} height={216} alt="" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rows.map((r) => (
                <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <span style={{ fontWeight: 800, fontSize: 40, color: TEXT_3, width: 30 }}>{r.rank}</span>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.8 }}>{r.name}</span>
                  <span style={{ fontSize: 28, fontWeight: 500, color: TEXT_2 }}>{r.tier}</span>
                  <span style={{ fontWeight: 800, fontSize: 44, letterSpacing: -0.6 }}>{r.price}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: "auto" }}>
            {counts.map(({ tier, n }) => (
              <div key={tier.id} style={{ display: "flex", alignItems: "center", gap: 6, opacity: n ? 1 : 0.35 }}>
                <img src={crestSrc(tier.id)} width={48} height={48} alt="" />
                <span style={{ fontWeight: 800, fontSize: 30, color: TEXT_2 }}>{n}</span>
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
