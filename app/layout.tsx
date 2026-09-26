import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

// Figures, ranks and LP: a condensed grotesk in the spirit of esports scoreboards.
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "급지.gg — 수도권 대장아파트 티어",
    template: "%s · 급지.gg",
  },
  description: "국토교통부 실거래가로 매일 새로 매기는 수도권 대장아파트 티어. 전용 84㎡ 대표가로 챌린저부터 아이언까지.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={barlow.variable}>
      <body>{children}</body>
    </html>
  );
}
