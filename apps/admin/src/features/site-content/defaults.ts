import { getLandingCopy, type LandingLocale } from "@orzuai/features/landing/i18n";

import type { SiteDocumentRecord } from "@/features/site-content/types";

export type SiteDocDefaults = {
  title: string;
  summary: string;
};

/**
 * Real welcome-page copy for a catalog document, pulled from the live landing
 * i18n source. Used to seed and to prefill the editor so admins edit the
 * actual current text — never the admin catalog label/description placeholders.
 * Returns null for documents that have no landing default (e.g. docs pages).
 */
export function getSiteDocDefaults(
  collection: SiteDocumentRecord["collection"],
  docKey: string,
  locale: SiteDocumentRecord["locale"],
): SiteDocDefaults | null {
  const copy = getLandingCopy(locale as LandingLocale);

  if (collection === "landing") {
    switch (docKey) {
      case "hero":
        return { title: copy.hero.title, summary: copy.hero.subtitle };
      case "architecture":
        return {
          title: copy.architecture.title,
          summary: copy.architecture.subtitle,
        };
      case "enterprise":
        return {
          title: copy.enterprise.title,
          summary: copy.enterprise.subtitle,
        };
      case "pricing":
        return { title: copy.pricing.title, summary: copy.pricing.subtitle };
      default:
        return null;
    }
  }

  if (collection === "faq" && docKey === "main") {
    return { title: copy.faq.title, summary: copy.faq.subtitle };
  }

  return null;
}
