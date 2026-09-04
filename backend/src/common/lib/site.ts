// Single source of truth for the absolute site origin — needed anywhere a
// full URL has to be embedded in output Next can't resolve relatively for us
// (JSON-LD <script> tags, sitemap.ts, robots.ts). Metadata objects don't need
// this: they resolve relative paths against `metadataBase` in app/layout.tsx.
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665";
