import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";
import { legalPagePath } from "@/features/legal/default-pages";
import { listPublishedLegalPages } from "@/services/legal-pages.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const legalPages = await listPublishedLegalPages();

  return [
    {
      url: APP_ORIGIN,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...legalPages.map((page) => ({
      url: `${APP_ORIGIN}${legalPagePath(page.slug)}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
