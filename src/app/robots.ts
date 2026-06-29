import type { MetadataRoute } from "next";

import { legalPagePath } from "@/features/legal/default-pages";
import { listPublishedLegalSlugs } from "@/services/legal-pages.service";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const legalSlugs = await listPublishedLegalSlugs();
  const allow = ["/", ...legalSlugs.map((slug) => legalPagePath(slug))];

  return {
    rules: {
      userAgent: "*",
      allow,
      disallow: ["/dashboard/", "/auth/", "/api/"],
    },
  };
}
