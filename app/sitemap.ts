import type { MetadataRoute } from "next";
import { getAllActiveVendorSlugs, getAllActiveProductSlugs } from "@/lib/vendors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${APP_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
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

  const products = await getAllActiveProductSlugs();
  for (const { vendorSlug, productSlug } of products) {
    entries.push({
      url: `${APP_URL}/${vendorSlug}/shop/${productSlug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
