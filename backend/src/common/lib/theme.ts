import type { StorefrontTheme } from "../../types";

export type { StorefrontTheme };

interface ThemePalette {
  light: string;
  light2: string;
  dark: string;
  dark2: string;
  label: string;
}

// Single source of truth for the 7 vendor-selectable storefront themes.
// The CSS-scoped mechanism (app/globals.css [data-storefront-theme="..."])
// hand-writes these same hex values for the DOM-rendered storefront; this
// table exists for the two places that can't read CSS custom properties —
// the dashboard color-picker swatches and the Satori-rendered OG images
// (lib/og-image.tsx) — so both stay in sync with a single edit point.
export const STOREFRONT_THEMES: Record<StorefrontTheme, ThemePalette> = {
  Red: { light: "#C0283A", light2: "#8C1827", dark: "#D43D50", dark2: "#F08898", label: "Red" },
  Emerald: { light: "#2E8A63", light2: "#1A6143", dark: "#3DAE7F", dark2: "#81DAB5", label: "Emerald" },
  Indigo: { light: "#2A37C0", light2: "#19238F", dark: "#4955D4", dark2: "#969DEE", label: "Indigo" },
  Orchid: { light: "#8A2DA9", light2: "#621B79", dark: "#A740C9", dark2: "#CF88E7", label: "Orchid" },
  // Added 2026-09-07 — deliberately warmer/richer than the original four,
  // aimed at a vendor who wants their storefront to read as upscale rather
  // than playful: antique gold, rose gold, and navy are the three "wealth
  // and professionalism" colors that also carry existing meaning in beauty
  // branding specifically (gold and rose gold packaging, navy for a more
  // clinical/skincare-forward shop), rather than three more hues picked
  // just to fill out the wheel.
  Gold: { light: "#96721B", light2: "#6B5113", dark: "#D9AC4E", dark2: "#F0D48F", label: "Gold" },
  RoseGold: { light: "#A65D57", light2: "#7A3F3A", dark: "#D68B84", dark2: "#EFC0BA", label: "Rose Gold" },
  Navy: { light: "#1E3A5F", light2: "#12253D", dark: "#4A7AB5", dark2: "#9BC0E5", label: "Navy" },
};
