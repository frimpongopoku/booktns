import type { StorefrontTheme } from "@/types";

export type { StorefrontTheme };

interface ThemePalette {
  light: string;
  light2: string;
  dark: string;
  dark2: string;
  label: string;
}

// Single source of truth for the 4 vendor-selectable storefront themes.
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
};
