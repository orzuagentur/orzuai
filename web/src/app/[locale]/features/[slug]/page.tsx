import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { BrandLogoWide } from "@/components/BrandLogo";
import {
  getSeoFeature,
  seoFeatureSlugs,
  SEO_FEATURES,
  SITE_URL,
} from "@/lib/seo-features";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    seoFeatureSlugs().map((slug) => ({ locale, slug })),
  );
}

function readList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function readFaq(
  raw: unknown,
): Array<{ q: string; a: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { q?: string; a?: string };
      if (!row.q || !row.a) return null;
      return { q: row.q, a: row.a };
    })
    .filter(Boolean) as Array<{ q: string; a: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const feature = getSeoFeature(slug);
  if (!feature) return { title: "Not found" };
  const t = await getTranslations({ locale, namespace: "seoFeatures" });
  const url = `${SITE_URL}/${locale}/features/${feature.slug}`;
  const keywords = readList(t.raw(`${slug}.keywords`));
  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}/en/features/${slug}`,
  };
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}/features/${slug}`;
  }
  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`),
    keywords: keywords.length ? keywords : feature.keywords,
    alternates: {
      canonical: `/${locale}/features/${slug}`,
      languages,
    },
    openGraph: {
      title: t(`${slug}.shortTitle`),
      description: t(`${slug}.description`),
      url,
      siteName: "OrzuAi",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "OrzuAi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t(`${slug}.shortTitle`),
      description: t(`${slug}.description`),
      images: ["/og.png"],
    },
  };
}

export default async function FeatureSeoPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const feature = getSeoFeature(slug);
  if (!feature) notFound();

  const t = await getTranslations("seoFeatures");
  const tc = await getTranslations("seoCta");
  const tChrome = await getTranslations("chrome");

  const shortTitle = t(`${slug}.shortTitle`);
  const summary = t(`${slug}.summary`);
  const bullets = readList(t.raw(`${slug}.bullets`));
  const searchIntents = readList(t.raw(`${slug}.searchIntents`));
  const faq = readFaq(t.raw(`${slug}.faq`));
  const ctaLabel = t(`${slug}.ctaLabel`);
  const title = t(`${slug}.title`);
  const description = t(`${slug}.description`);

  const url = `${SITE_URL}/${locale}/features/${feature.slug}`;
  const others = SEO_FEATURES.filter((f) => f.slug !== feature.slug).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: locale,
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
        mainEntity: faq.map((item) => ({
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
            name: "OrzuAi",
            item: `${SITE_URL}/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: tChrome("features"),
            item: `${SITE_URL}/${locale}/features`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: shortTitle,
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
            OrzuAi · {shortTitle}
          </p>
          <BrandLogoWide width={160} />
          <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {shortTitle}
          </h1>
          <p className="text-[color:var(--muted)]">{summary}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#1a1208]"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-dim))",
              }}
            >
              {ctaLabel}
            </Link>
            <Link
              href="/features"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] px-5 text-sm font-semibold text-[color:var(--fg)]"
            >
              {tc("allFeatures")}
            </Link>
          </div>
        </header>

        <section className="space-y-3">
          <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--muted)]">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        {searchIntents.length > 0 ? (
          <section className="space-y-3">
            <p className="text-sm text-[color:var(--muted)]">
              {searchIntents.join(", ")}
            </p>
          </section>
        ) : null}

        <section className="space-y-4">
          {faq.map((item) => (
            <div key={item.q} className="space-y-1.5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="text-sm text-[color:var(--muted)]">{item.a}</p>
            </div>
          ))}
        </section>

        {others.length > 0 && (
          <section className="space-y-3 border-t border-[color:var(--line)] pt-8">
            <ul className="flex flex-wrap gap-2">
              {others.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/features/${f.slug}`}
                    className="inline-flex rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fg)] transition hover:border-[color:var(--accent)]/50"
                  >
                    {t(`${f.slug}.shortTitle`)}
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
