import { headers } from "next/headers";

export const CUSTOM_DOMAIN_HEADER = "x-booktns-custom-domain";

// Single source of truth for "is this request being served via a verified
// custom domain?" — always reads the header proxy.ts stamps, never
// re-derived independently (e.g. via hostname-vs-env-var comparison in some
// other layer). Two independently-computed answers can silently disagree —
// see proxy.ts for the authoritative, DB-backed check.
export async function isRequestFromCustomDomain(): Promise<boolean> {
  const h = await headers();
  return h.get(CUSTOM_DOMAIN_HEADER) === "1";
}
