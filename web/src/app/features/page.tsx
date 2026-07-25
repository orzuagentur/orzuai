import Link from "next/link";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";
import { BrandLogoWide } from "@/components/BrandLogo";
import {
  SEO_FEATURES,
  SEO_FEATURE_GROUPS,
  SITE_URL,
  type SeoFeature,
} from "@/lib/seo-features";

export const metadata: Metadata = {
  title: "OrzuAi features — AI Video, editors, 3D, icons & more",
  description:
    "All OrzuAi tools: AI Video, Shorts, clipping, presentations, video/photo editors, 3D models, HDRIs, textures, emojis, icons, and media search.",
  keywords: [
    "OrzuAi features",
    "AI video",
    "video editor",
    "photo editor",
    "3D models",
    "HDRI",
    "textures",
    "emojis",
    "icons",
    "ИИ видео",
    "3д модели",
  ],
  alternates: { canonical: "/features" },
  openGraph: {
    title: "OrzuAi features",
    description:
      "AI creation, editors, media search, and creator asset libraries — one studio.",
    url: `${SITE_URL}/features`,
    siteName: "OrzuAi",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OrzuAi" }],
  },
};

const GROUP_ORDER: SeoFeature["group"][] = [
  "create",
  "edit",
  "media",
  "assets",
  "publish",
];

export default function FeaturesHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "OrzuAi product tools",
    itemListElement: SEO_FEATURES.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.shortTitle,
      url: `${SITE_URL}/features/${f.slug}`,
      description: f.description,
    })),
  };

  return (
    <SiteChrome wide>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="space-y-12 pb-16 pt-8">
        <header className="max-w-2xl space-y-3">
          <BrandLogoWide width={170} />
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-3xl">
            Everything in OrzuAi
          </h1>
          <p className="text-[color:var(--muted)]">
            AI creation, editors, media search, and asset libraries — pick a
            tool to learn how OrzuAi helps, then start free.
          </p>
        </header>

        {GROUP_ORDER.map((group) => {
          const meta = SEO_FEATURE_GROUPS[group];
          const items = SEO_FEATURES.filter((f) => f.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="space-y-4">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight">
                  {meta.label}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {meta.blurb}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <Link
                    key={f.slug}
                    href={`/features/${f.slug}`}
                    className="group block rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[color:rgba(196,125,34,0.4)]"
                  >
                    <h3 className="font-[family-name:var(--font-syne)] text-base font-bold tracking-tight group-hover:text-[color:var(--accent)]">
                      {f.shortTitle}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">
                      {f.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-sm text-[color:var(--muted)]">
          Product overview:{" "}
          <Link href="/about" className="text-[color:var(--accent)] hover:underline">
            About OrzuAi
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
