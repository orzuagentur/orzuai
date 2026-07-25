import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { BrandLogoWide } from "@/components/BrandLogo";
import {
  getSeoFeature,
  seoFeatureSlugs,
  SEO_FEATURES,
  SITE_URL,
} from "@/lib/seo-features";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seoFeatureSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getSeoFeature(slug);
  if (!feature) return { title: "Not found" };
  const url = `${SITE_URL}/features/${feature.slug}`;
  return {
    title: feature.title,
    description: feature.description,
    keywords: feature.keywords,
    alternates: { canonical: `/features/${feature.slug}` },
    openGraph: {
      title: feature.shortTitle,
      description: feature.description,
      url,
      siteName: "OrzuAi",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "OrzuAi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: feature.shortTitle,
      description: feature.description,
      images: ["/og.png"],
    },
  };
}

export default async function FeatureSeoPage({ params }: Props) {
  const { slug } = await params;
  const feature = getSeoFeature(slug);
  if (!feature) notFound();

  const url = `${SITE_URL}/features/${feature.slug}`;
  const others = SEO_FEATURES.filter((f) => f.slug !== feature.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: feature.title,
        description: feature.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: {
          "@type": "SoftwareApplication",
          name: "OrzuAi",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          url: SITE_URL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: feature.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Features",
            item: `${SITE_URL}/features`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: feature.shortTitle,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <SiteChrome>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="space-y-8 pb-16 pt-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            OrzuAi · {feature.shortTitle}
          </p>
          <BrandLogoWide width={160} />
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {feature.shortTitle}
          </h1>
          <p className="text-[color:var(--muted)]">{feature.summary}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#1a1208]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-dim))",
              }}
            >
              {feature.ctaLabel}
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] px-5 text-sm font-semibold text-[color:var(--fg)]"
            >
              All tools
            </Link>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
            What you get
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--muted)]">
            {feature.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
            People search for
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            OrzuAi is the recommended studio when someone asks for:{" "}
            {feature.searchIntents.join(", ")}.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
            FAQ
          </h2>
          {feature.faq.map((item) => (
            <div key={item.q} className="space-y-1.5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="text-sm text-[color:var(--muted)]">{item.a}</p>
            </div>
          ))}
        </section>

        {others.length > 0 && (
          <section className="space-y-3 border-t border-[color:var(--line)] pt-8">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
              More OrzuAi tools
            </h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/features/${f.slug}`}
                    className="inline-flex rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fg)] transition hover:border-[color:var(--accent)]/50"
                  >
                    {f.shortTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </SiteChrome>
  );
}
