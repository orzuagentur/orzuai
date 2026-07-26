import type { MetadataRoute } from "next";
import { seoFeatureSlugs } from "@/lib/seo-features";
import { routing } from "@/i18n/routing";

const SITE = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.orzuai.com"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"];
  }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/features", priority: 0.95, changeFrequency: "weekly" },
    { path: "/about", priority: 0.9, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.85, changeFrequency: "monthly" },
    { path: "/login", priority: 0.55, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
    ...seoFeatureSlugs().map((slug) => ({
      path: `/features/${slug}`,
      priority: 0.92,
      changeFrequency: "weekly" as const,
    })),
  ];

  return pages.flatMap((p) =>
    routing.locales.map((locale) => {
      const localPath = `/${locale}${p.path}`;
      const languages: Record<string, string> = {
        "x-default": `${SITE}/en${p.path}`,
      };
      for (const l of routing.locales) {
        languages[l] = `${SITE}/${l}${p.path}`;
      }
      return {
        url: `${SITE}${localPath}`,
        lastModified: now,
        changeFrequency: p.changeFrequency,
        priority: p.priority,
        alternates: { languages },
      };
    }),
  );
}
