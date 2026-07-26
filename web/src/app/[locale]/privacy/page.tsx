import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { SiteChrome, LegalArticle } from "@/components/SiteChrome";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo-features";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}/en/privacy`,
  };
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}/privacy`;
  }
  return {
    title: t("privacyTitle"),
    description: t("privacyMeta"),
    alternates: { canonical: `/${locale}/privacy`, languages },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <SiteChrome>
      <LegalArticle title={t("privacyTitle")} updated={t("updated")}>
        <div
          className="legal-html space-y-5 [&_a]:text-[color:var(--accent)] [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:pt-2 [&_h2]:font-[family-name:var(--font-syne)] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: t.raw("privacyHtml") as string }}
        />
      </LegalArticle>
    </SiteChrome>
  );
}
