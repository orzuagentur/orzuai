import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { BrandLogoWide } from "@/components/BrandLogo";
import {
  SEO_FEATURES,
  SITE_URL,
  type SeoFeature,
} from "@/lib/seo-features";

type Props = { params: Promise<{ locale: string }> };

const GROUP_ORDER: SeoFeature["group"][] = [
  "create",
  "edit",
  "media",
  "assets",
  "publish",
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "featuresHub" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/features`,
      languages: {
        en: `${SITE_URL}/en/features`,
        ru: `${SITE_URL}/ru/features`,
        de: `${SITE_URL}/de/features`,
        "x-default": `${SITE_URL}/en/features`,
      },
    },
  };
}

export default async function FeaturesHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("featuresHub");
  const tg = await getTranslations("seoGroups");
  const tf = await getTranslations("seoFeatures");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "OrzuAi product tools",
    inLanguage: locale,
    itemListElement: SEO_FEATURES.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: tf(`${f.slug}.shortTitle`),
      url: `${SITE_URL}/${locale}/features/${f.slug}`,
      description: tf(`${f.slug}.description`),
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
            {t("title")}
          </h1>
          <p className="text-[color:var(--muted)]">{t("lead")}</p>
        </header>

        {GROUP_ORDER.map((group) => {
          const items = SEO_FEATURES.filter((f) => f.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="space-y-4">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold tracking-tight">
                  {tg(`${group}.label`)}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {tg(`${group}.blurb`)}
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
                      {tf(`${f.slug}.shortTitle`)}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">
                      {tf(`${f.slug}.summary`)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-sm text-[color:var(--muted)]">
          <Link href="/about" className="text-[color:var(--accent)] hover:underline">
            {t("aboutLink")}
          </Link>
        </p>
      </article>
    </SiteChrome>
  );
}
