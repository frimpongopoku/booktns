import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { withSentryConfig } from "@sentry/nextjs";
import packageJson from "./package.json";

// Computed once at build time, not per-request — git history is only
// available on the machine/CI runner doing the build, not at runtime.
function getBuildNumber(): string {
  try {
    return execSync("git rev-list --count HEAD").toString().trim();
  } catch {
    return "0";
  }
}

const nextConfig: NextConfig = {
  // @resvg/resvg-js and sharp both ship a native binary via platform-specific
  // optional dependencies (e.g. @resvg/resvg-js-darwin-arm64, @img/sharp-linux-x64)
  // — the bundler can't resolve those statically, so they must be loaded via
  // Node's real require at runtime instead of being bundled. Without sharp
  // here, Turbopack tried to bundle it anyway and shipped the wrong
  // platform's binary, crashing every request under app/[slug]/icon.tsx and
  // apple-icon.tsx (which Next invokes automatically for the favicon on
  // every storefront page) with ERR_DLOPEN_FAILED on libvips-cpp.so.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_NUMBER: getBuildNumber(),
  },
  // PostHog reverse proxy. Analytics requests go to a first-party /ingest
  // path instead of directly to posthog.com, which content blockers block
  // by hostname — without this a large share of real visits never gets
  // counted. `/ingest/static` serves the library assets and must point at
  // the asset host, not the API host.
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    const assetHost = host.replace(".i.posthog.com", "-assets.i.posthog.com");

    return [
      { source: "/ingest/static/:path*", destination: `${assetHost}/static/:path*` },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
    ];
  },
  // The rewrites above proxy to a different origin; without this, requests
  // that end in a trailing slash get redirected and lose their payload.
  skipTrailingSlashRedirect: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // No auth token configured yet — source map upload is skipped silently
  // rather than failing the build until SENTRY_AUTH_TOKEN is set.
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true } },
});
