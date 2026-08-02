import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";
import { DOCS_ROUTES } from "@/constants/routes";
import { legalPagePath } from "@/features/legal/default-pages";
import { listPublishedLegalSlugs } from "@/services/legal-pages.service";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const legalSlugs = await listPublishedLegalSlugs();
  const allow = [
    "/",
    "/solutions",
    DOCS_ROUTES.root,
    ...legalSlugs.map((slug) => legalPagePath(slug)),
  ];
  const disallow = ["/dashboard/", "/auth/", "/api/"];
  const crawlRules = {
    allow,
    disallow,
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...crawlRules,
      },
      {
        userAgent: "Googlebot",
        ...crawlRules,
      },
      {
        userAgent: "Bingbot",
        ...crawlRules,
      },
      {
        userAgent: "OAI-SearchBot",
        ...crawlRules,
      },
      {
        userAgent: "ChatGPT-User",
        ...crawlRules,
      },
      {
        userAgent: "GPTBot",
        ...crawlRules,
      },
    ],
    sitemap: `${APP_ORIGIN}/sitemap.xml`,
    host: APP_ORIGIN,
  };
}
