import type { MetadataRoute } from "next";
import { getAllActiveVendorSlugs } from "@/lib/vendors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const slugs = await getAllActiveVendorSlugs();
  for (const slug of slugs) {
    entries.push(
      {
        url: `${APP_URL}/${slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${APP_URL}/${slug}/shop`,
        changeFrequency: "weekly",
        priority: 0.7,
      }
    );
  }

  return entries;
}
