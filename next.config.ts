import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js ships a native binary via platform-specific optional
  // dependencies (e.g. @resvg/resvg-js-darwin-arm64) — the bundler can't
  // resolve those statically, so it must be loaded via Node's real require
  // at runtime instead of being bundled.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
