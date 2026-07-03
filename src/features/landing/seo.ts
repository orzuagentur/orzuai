import { APP_ORIGIN } from "@/constants/app-origin";
import {
  getLandingCopy,
  LANDING_LOCALES,
  resolveLandingLocale,
  type LandingLocale,
} from "@/features/landing/i18n";

export function buildLandingPageUrl(locale: LandingLocale): string {
  if (locale === "en") return APP_ORIGIN;
  return `${APP_ORIGIN}/?lang=${locale}`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OrzuX",
    url: APP_ORIGIN,
    logo: `${APP_ORIGIN}/platform-icon-light.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@orzux.com",
      availableLanguage: ["English", "Russian", "Uzbek"],
    },
  };
}

export function buildSoftwareApplicationSchema(locale: LandingLocale) {
  const copy = getLandingCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OrzuX",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: buildLandingPageUrl(locale),
    inLanguage: locale,
    description: copy.meta.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function buildFaqPageSchema(locale: LandingLocale) {
  const faq = getLandingCopy(locale).faq;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildLandingStructuredData(locale: LandingLocale) {
  return [
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(locale),
    buildFaqPageSchema(locale),
  ];
}

export function buildLandingHreflangAlternates() {
  const languages = Object.fromEntries(
    LANDING_LOCALES.map((locale) => [locale, buildLandingPageUrl(locale)]),
  );

  return {
    ...languages,
    "x-default": APP_ORIGIN,
  };
}

export function resolveLocaleFromSearchParam(
  value: string | string[] | undefined,
): LandingLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  return resolveLandingLocale(raw);
}
