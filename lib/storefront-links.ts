// Builds a storefront-internal href, dropping the vendor-slug prefix when
// the current request is being served via a verified custom domain (so the
// browser navigates to the clean URL) and keeping it otherwise. `path` must
// already carry its own leading "/" or "#" (or be "" for the home page).
//
// Pure — no `next/headers` import — safe to import from client components.
// Server components compute `isCustomDomain` once via
// `isRequestFromCustomDomain()` (lib/request-context.ts) and pass it down
// as an explicit prop, exactly like `slug` is already threaded everywhere
// in this codebase.
export function storefrontHref(slug: string, isCustomDomain: boolean, path: string = ""): string {
  if (isCustomDomain) {
    return path.startsWith("#") ? `/${path}` : path || "/";
  }
  return `/${slug}${path}`;
}
