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
import { listPlatformPlans } from "@/services/platform-plans.service";
import { getLandingCopyWithCms } from "@/services/site-content.service";

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
    keywords: [
      "OrzuX",
      "OrzuX",
      "AI business communication platform",
      "AI customer support",
      "unified AI inbox",
      "WhatsApp Business inbox",
      "Instagram DM CRM",
      "Telegram customer service",
      "AI voice agent",
      "CRM and calendar tools",
      "customer channel integrations",
    ],
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
  const [user, legalFooterLinks, params, plans] = await Promise.all([
    getCurrentUser(),
    listFooterLegalLinks(),
    searchParams,
    listPlatformPlans({ activeOnly: true, publicOnly: true }),
  ]);

  if (user) {
    redirect(APP_ROUTES.dashboard);
  }

  const locale = resolveLocaleFromSearchParam(params.lang);
  const structuredData = buildLandingStructuredData(locale);
  const baseCopy = getLandingCopy(locale);
  const copyOverride = await getLandingCopyWithCms(locale, baseCopy);

  const planCards = plans.map((plan) => ({
    id: plan.id,
    label: plan.label,
    tagline: plan.tagline,
    priceMonthly: plan.priceMonthly,
    highlighted: plan.highlighted,
    features: plan.features,
  }));

  return (
    <>
      {structuredData.map((schema) => (
        <script
          key={schema["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingPage
        legalFooterLinks={legalFooterLinks}
        plans={planCards}
        copyOverride={copyOverride}
      />
    </>
  );
}
