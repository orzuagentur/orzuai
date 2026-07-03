import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";
import { legalPagePath } from "@/features/legal/default-pages";
import { LANDING_LOCALES } from "@/features/landing/i18n";
import { buildLandingPageUrl } from "@/features/landing/seo";
import { listPublishedLegalPages } from "@/services/legal-pages.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const legalPages = await listPublishedLegalPages();

  return [
    ...LANDING_LOCALES.map((locale) => ({
      url: buildLandingPageUrl(locale),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: locale === "en" ? 1 : 0.9,
      alternates: {
        languages: Object.fromEntries(
          LANDING_LOCALES.map((entry) => [entry, buildLandingPageUrl(entry)]),
        ),
      },
    })),
    ...legalPages.map((page) => ({
      url: `${APP_ORIGIN}${legalPagePath(page.slug)}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
