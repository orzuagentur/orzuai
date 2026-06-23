import type { MetadataRoute } from "next";

import { APP_ORIGIN } from "@/constants/app-origin";

const PUBLIC_ROUTES = ["", "/privacy", "/terms", "/data-deletion"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${APP_ORIGIN}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
