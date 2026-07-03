import type { KnowledgeCategory } from "@/types/database.types";

export const KNOWLEDGE_CATEGORIES = [
  "Services",
  "Pricing",
  "Address",
  "Contact",
  "FAQ",
  "Business Hours",
  "Policies",
  "Additional",
] as const satisfies readonly KnowledgeCategory[];

export type KnowledgeCategoryId = (typeof KNOWLEDGE_CATEGORIES)[number];

export const KNOWLEDGE_CATEGORY_META: Record<
  KnowledgeCategoryId,
  { label: string; description: string; tone: string }
> = {
  Services: {
    label: "Services",
    description: "What you offer and how it works",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  Pricing: {
    label: "Pricing",
    description: "Rates, packages, and payment terms",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  Address: {
    label: "Address",
    description: "Locations, branches, and service areas",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  Contact: {
    label: "Contact",
    description: "Phone, email, and support channels",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  FAQ: {
    label: "FAQ",
    description: "Common customer questions",
    tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  "Business Hours": {
    label: "Business Hours",
    description: "Opening hours and availability",
    tone: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  Policies: {
    label: "Policies",
    description: "Returns, privacy, and terms",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  Additional: {
    label: "Additional",
    description: "Extra facts the AI should know",
    tone: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
};

export function isKnowledgeCategory(value: string): value is KnowledgeCategoryId {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}

export function resolveKnowledgeCategory(value: string | undefined): KnowledgeCategoryId {
  if (value && isKnowledgeCategory(value)) {
    return value;
  }

  const normalized = value?.trim().toLowerCase() ?? "";

  if (/price|pricing|cost|tariff|rate/.test(normalized)) return "Pricing";
  if (/address|location|office|branch|area/.test(normalized)) return "Address";
  if (/contact|phone|email|support/.test(normalized)) return "Contact";
  if (/faq|question/.test(normalized)) return "FAQ";
  if (/hour|schedule|open|time/.test(normalized)) return "Business Hours";
  if (/policy|terms|privacy|return|refund/.test(normalized)) return "Policies";
  if (/service|product|offer/.test(normalized)) return "Services";

  return "Additional";
}
