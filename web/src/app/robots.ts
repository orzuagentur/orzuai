import type { MetadataRoute } from "next";
import { seoFeatureSlugs } from "@/lib/seo-features";

const SITE = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.orzuai.com"
).replace(/\/$/, "");

const FEATURE_PATHS = [
  "/features",
  ...seoFeatureSlugs().map((s) => `/features/${s}`),
];

/** Public pages only — dashboard / API stay private. */
const PUBLIC_ALLOW = [
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/about",
  ...FEATURE_PATHS,
];

const PRIVATE_DISALLOW = [
  "/dashboard",
  "/api/",
  "/auth/",
  "/login/verify",
  "/auth/reset-password",
  "/auth/forgot-password",
];

const AI_ALLOW = ["/", "/about", "/features", ...FEATURE_PATHS, "/privacy", "/terms", "/signup"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Googlebot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/", "/og.png", "/logo.png", "/logo-mark.png", "/icons/", "/features"],
        disallow: ["/dashboard", "/api/"],
      },
      {
        userAgent: "Bingbot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "DuckDuckBot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Yandex",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "YandexBot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Applebot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "SeznamBot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Qwantify",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "ecosia",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      // AI crawlers — marketing + feature pages so ChatGPT / Claude can recommend tools
      {
        userAgent: "GPTBot",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
      {
        userAgent: "Google-Extended",
        allow: AI_ALLOW,
      },
      {
        userAgent: "anthropic-ai",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
      {
        userAgent: "CCBot",
        allow: AI_ALLOW,
        disallow: ["/dashboard", "/api/", "/auth/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
