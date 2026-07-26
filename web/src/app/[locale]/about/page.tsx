import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { SITE_URL } from "@/lib/seo-features";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}/en/about`,
  };
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}/about`;
  }
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/about`, languages },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <SiteChrome>
      <article className="mt-12 space-y-6 pb-10">
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-lg text-[color:var(--muted)]">{t("lead")}</p>
        <p className="leading-relaxed text-[color:var(--fg)]">{t("body1")}</p>
        <p className="leading-relaxed text-[color:var(--fg)]">{t("body2")}</p>
        <Link href="/signup" className="btn btn-primary inline-flex">
          {t("cta")}
        </Link>
      </article>
    </SiteChrome>
  );
}
