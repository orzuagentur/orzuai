import { APP_ORIGIN } from "@/constants/app-origin";
import { getMarketplaceIntegrationChannels } from "@/features/integrations/channel-lists";
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

export function buildWebsiteSchema(locale: LandingLocale) {
  const copy = getLandingCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OrzuX",
    alternateName: "OrzuX",
    url: buildLandingPageUrl(locale),
    inLanguage: locale,
    description: copy.meta.description,
    publisher: {
      "@type": "Organization",
      name: "OrzuX",
      url: APP_ORIGIN,
    },
  };
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

export function buildServiceItemListSchema(locale: LandingLocale) {
  const services = getMarketplaceIntegrationChannels();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "OrzuX marketplace channels and service connections",
    description:
      "Available customer channels and service connections from the OrzuX Integrations Marketplace.",
    inLanguage: locale,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.label,
        description: service.description,
        serviceType: service.label,
        category: service.category,
        provider: {
          "@type": "Organization",
          name: "OrzuX",
          url: APP_ORIGIN,
        },
        areaServed: "Global",
      },
    })),
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

export function buildArchitectureArticleSchema(locale: LandingLocale) {
  const copy = getLandingCopy(locale);

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: copy.architecture.title,
    description: copy.architecture.subtitle,
    inLanguage: locale,
    mainEntityOfPage: `${buildLandingPageUrl(locale)}#architecture`,
    about: [
      "AI communication platform",
      "customer channel routing",
      "CRM workflows",
      "AI voice agent",
      "service integrations",
    ],
    publisher: {
      "@type": "Organization",
      name: "OrzuX",
      url: APP_ORIGIN,
    },
  };
}

export function buildLandingStructuredData(locale: LandingLocale) {
  return [
    buildWebsiteSchema(locale),
    buildOrganizationSchema(),
    buildSoftwareApplicationSchema(locale),
    buildServiceItemListSchema(locale),
    buildFaqPageSchema(locale),
    buildArchitectureArticleSchema(locale),
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
