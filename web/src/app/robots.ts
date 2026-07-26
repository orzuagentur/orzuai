import type { MetadataRoute } from "next";
import { seoFeatureSlugs } from "@/lib/seo-features";
import { routing } from "@/i18n/routing";

const SITE = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.orzuai.com"
).replace(/\/$/, "");

const FEATURE_SUFFIXES = [
  "/features",
  ...seoFeatureSlugs().map((s) => `/features/${s}`),
];

function withLocales(paths: string[]): string[] {
  const out: string[] = [];
  for (const locale of routing.locales) {
    for (const path of paths) {
      out.push(path === "/" ? `/${locale}` : `/${locale}${path}`);
    }
  }
  return out;
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/about",
  ...FEATURE_SUFFIXES,
];

const PUBLIC_ALLOW = withLocales(PUBLIC_PATHS);

const PRIVATE_DISALLOW = withLocales([
  "/dashboard",
  "/login/verify",
  "/auth/reset-password",
  "/auth/forgot-password",
]).concat(["/api/", "/auth/callback", "/auth/signout"]);

const AI_ALLOW = withLocales([
  "/",
  "/about",
  "/features",
  ...FEATURE_SUFFIXES,
  "/privacy",
  "/terms",
  "/signup",
]);

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
        allow: ["/", "/og.png", "/logo.png", "/logo-mark.png", "/icons/", ...withLocales(["/features"])],
        disallow: [...withLocales(["/dashboard"]), "/api/"],
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
      {
        userAgent: "GPTBot",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
      {
        userAgent: "Google-Extended",
        allow: AI_ALLOW,
      },
      {
        userAgent: "anthropic-ai",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
      {
        userAgent: "CCBot",
        allow: AI_ALLOW,
        disallow: [...withLocales(["/dashboard"]), "/api/", "/auth/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
