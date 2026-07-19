import type { SiteDocumentRecord } from "@/features/site-content/types";

type CatalogItem = {
  collection: SiteDocumentRecord["collection"];
  docKey: string;
  title: string;
  description: string;
  editor: "prose" | "faq" | "architecture" | "enterprise" | "docs";
};

const DOC_PAGES: Array<{ docKey: string; title: string }> = [
  { docKey: "about", title: "About OrzuX" },
  { docKey: "getting-started", title: "Getting started" },
  { docKey: "account-and-sign-in", title: "Account & sign-in" },
  { docKey: "inbox", title: "Unified inbox" },
  { docKey: "channels", title: "Channels" },
  { docKey: "orders", title: "Orders" },
  { docKey: "calls", title: "Calls AI" },
  { docKey: "crm", title: "CRM & contacts" },
  { docKey: "calendar", title: "Calendar & booking" },
  { docKey: "ai-agent", title: "AI Agent" },
  { docKey: "knowledge-base", title: "Knowledge base" },
  { docKey: "human-handoff", title: "Human handoff" },
  { docKey: "integrations", title: "Integrations" },
  { docKey: "team", title: "Team & permissions" },
  { docKey: "analytics", title: "Analytics" },
  { docKey: "billing", title: "Billing & usage" },
  { docKey: "security-and-privacy", title: "Security & privacy" },
  { docKey: "use-cases", title: "Use cases overview" },
  { docKey: "clinics-and-medical", title: "Clinics & medical" },
  { docKey: "real-estate", title: "Real estate" },
  { docKey: "hospitality-and-hotels", title: "Hospitality & hotels" },
  { docKey: "beauty-and-salons", title: "Beauty & salons" },
  { docKey: "home-services", title: "Home services" },
  { docKey: "education-and-training", title: "Education & training" },
  { docKey: "auto-and-dealerships", title: "Auto & dealerships" },
  { docKey: "restaurants-and-cafes", title: "Restaurants & cafés" },
  { docKey: "professional-services", title: "Professional services" },
  { docKey: "fitness-and-wellness", title: "Fitness & wellness" },
];

export const SITE_CONTENT_CATALOG: CatalogItem[] = [
  {
    collection: "landing",
    docKey: "hero",
    title: "Hero (welcome)",
    description: "Main headline and supporting text at the top of the welcome page.",
    editor: "prose",
  },
  {
    collection: "landing",
    docKey: "architecture",
    title: "Architecture",
    description: "From channel event to business outcome — pipeline copy.",
    editor: "architecture",
  },
  {
    collection: "landing",
    docKey: "enterprise",
    title: "Enterprise readiness",
    description: "Honest enterprise pillars, checklist, and scope note.",
    editor: "enterprise",
  },
  {
    collection: "landing",
    docKey: "pricing",
    title: "Pricing section labels",
    description:
      "Eyebrow/title/subtitle/CTAs. Plan prices & features come from Billing → Tariffs and appear on the site automatically.",
    editor: "prose",
  },
  {
    collection: "faq",
    docKey: "main",
    title: "FAQ",
    description: "Every question and answer on the welcome page.",
    editor: "faq",
  },
  ...DOC_PAGES.map((page) => ({
    collection: "docs" as const,
    docKey: page.docKey,
    title: `Docs · ${page.title}`,
    description: `Documentation page: ${page.title}`,
    editor: "docs" as const,
  })),
];

export const SITE_CONTENT_LOCALE_LABELS = {
  en: "English",
  ru: "Русский",
  uz: "Oʻzbekcha",
} as const;
