// Sales page fonts, self-hosted by next/font. preload is off and each font
// only declares a CSS variable, so a page downloads just the font it uses.

import { Inter, Lato, Montserrat, Nunito, Poppins, Raleway, Roboto } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap", preload: false });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-lato", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap", preload: false });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap", preload: false });

export const SALES_FONTS = [
  { name: "Inter", variable: "--font-inter", note: "Clean and neutral" },
  { name: "Poppins", variable: "--font-poppins", note: "Friendly and geometric" },
  { name: "Roboto", variable: "--font-roboto", note: "Familiar and practical" },
  { name: "Lato", variable: "--font-lato", note: "Warm and professional" },
  { name: "Montserrat", variable: "--font-montserrat", note: "Bold and modern" },
  { name: "Nunito", variable: "--font-nunito", note: "Soft and rounded" },
  { name: "Raleway", variable: "--font-raleway", note: "Elegant and light" },
] as const;

/** Class names that declare every font's CSS variable (no files load until used). */
export const fontVariablesClass = [inter, poppins, roboto, lato, montserrat, nunito, raleway]
  .map((f) => f.variable)
  .join(" ");

/** CSS font-family value for a saved font name; unknown names fall back to Inter. */
export function fontStack(name: string | undefined): string {
  const font = SALES_FONTS.find((f) => f.name === name) ?? SALES_FONTS[0];
  return `var(${font.variable}), system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
}
