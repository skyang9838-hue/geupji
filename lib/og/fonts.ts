/**
 * Share-card fonts. Satori needs TTF/OTF data, and Korean faces are large, so
 * each card asks Google Fonts for exactly the glyphs it prints (the `text=`
 * parameter), which answers with a small TrueType file.
 */
export async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const glyphs = [...new Set(text)].join("");
  const url =
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}` +
    `&text=${encodeURIComponent(glyphs)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`Google Fonts returned no TrueType source for ${family} ${weight}`);
  return (await fetch(src)).arrayBuffer();
}

/** Noto Sans KR for everything (the page's Pretendard is not on Google Fonts); figures use the bold cut. */
export async function cardFonts(bold: string, regular: string, figures: string) {
  const [heavy, text] = await Promise.all([
    googleFont("Noto Sans KR", 800, bold + figures),
    googleFont("Noto Sans KR", 500, regular + figures),
  ]);
  return [
    { name: "Noto Sans KR", data: heavy, weight: 800 as const, style: "normal" as const },
    { name: "Noto Sans KR", data: text, weight: 500 as const, style: "normal" as const },
  ];
}
