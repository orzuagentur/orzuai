import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";
import { DOCS_ROUTES } from "@/constants/routes";
import { legalPagePath } from "@/features/legal/default-pages";
import { getDocsSlugs } from "@/features/docs/nav";
import { LANDING_LOCALES } from "@/features/landing/i18n";
import { buildLandingPageUrl } from "@/features/landing/seo";
import {
  buildSolutionHreflangAlternates,
  buildSolutionUrl,
  SOLUTION_PAGES,
} from "@/features/seo/solution-pages";
import { listPublishedLegalPages } from "@/services/legal-pages.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const legalPages = await listPublishedLegalPages();
  const docsSlugs = getDocsSlugs();

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
    {
      url: `${APP_ORIGIN}/solutions`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...SOLUTION_PAGES.map((page) => ({
      url: buildSolutionUrl(page.slug, "en"),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: {
        languages: buildSolutionHreflangAlternates(page.slug),
      },
    })),
    {
      url: `${APP_ORIGIN}${DOCS_ROUTES.root}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...docsSlugs.map((slug) => ({
      url: `${APP_ORIGIN}${DOCS_ROUTES.page(slug)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...legalPages.map((page) => ({
      url: `${APP_ORIGIN}${legalPagePath(page.slug)}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
