import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { APP_ORIGIN } from "@/constants/app-origin";
import { APP_ROUTES } from "@/constants/routes";
import { getLandingCopy } from "@/features/landing/i18n";
import {
  buildLandingHreflangAlternates,
  buildLandingStructuredData,
  resolveLocaleFromSearchParam,
} from "@/features/landing/seo";
import { getCurrentUser } from "@/services/auth.service";
import { listFooterLegalLinks } from "@/services/legal-pages.service";

type HomePageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = resolveLocaleFromSearchParam(params.lang);
  const copy = getLandingCopy(locale);
  const pageUrl = locale === "en" ? APP_ORIGIN : `${APP_ORIGIN}/?lang=${locale}`;

  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: {
      canonical: pageUrl,
      languages: buildLandingHreflangAlternates(),
    },
    openGraph: {
      type: "website",
      url: pageUrl,
      siteName: "OrzuX",
      locale: locale === "en" ? "en_US" : locale === "ru" ? "ru_RU" : "uz_UZ",
      title: copy.meta.title,
      description: copy.meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: copy.meta.title,
      description: copy.meta.description,
    },
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const [user, legalFooterLinks, params] = await Promise.all([
    getCurrentUser(),
    listFooterLegalLinks(),
    searchParams,
  ]);

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  const locale = resolveLocaleFromSearchParam(params.lang);
  const structuredData = buildLandingStructuredData(locale);

  return (
    <>
      {structuredData.map((schema) => (
        <script
          key={schema["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingPage legalFooterLinks={legalFooterLinks} />
    </>
  );
}
