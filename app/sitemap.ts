import type { MetadataRoute } from "next";
import { vendor } from "@/lib/data";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Single dummy vendor today — becomes a real query across all active vendors
// once the database is wired up.
const vendors = [vendor];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  for (const v of vendors) {
    if (!v.active) continue;
    entries.push(
      {
        url: `${APP_URL}/${v.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${APP_URL}/${v.slug}/shop`,
        changeFrequency: "weekly",
        priority: 0.7,
      }
    );
  }

  return entries;
}
