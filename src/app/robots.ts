import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/data-deletion"],
        disallow: ["/dashboard", "/dashboard/", "/auth", "/auth/", "/api", "/api/"],
      },
    ],
    sitemap: `${APP_ORIGIN}/sitemap.xml`,
    host: APP_ORIGIN,
  };
}
