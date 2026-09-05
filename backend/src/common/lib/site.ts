import { config } from "../config";

// Single source of truth for the absolute site origin — needed anywhere a
// full URL has to be embedded in output this service generates (PDFs,
// contact links). Comes from config.appUrl (PUBLIC_APP_URL) — this is the
// backend, not the Next.js frontend, so NEXT_PUBLIC_APP_URL is never set
// here and would silently fall back to localhost in production.
export const SITE_URL = config.appUrl;
