import type { KnowledgeCategoryId } from "@/features/knowledge-base/categories";

export type KnowledgeLayoutKind =
  | "services"
  | "pricing"
  | "faq"
  | "hours"
  | "contact"
  | "address"
  | "policies"
  | "generic";

export type KnowledgeCategoryCard = {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string;
  layoutKind: KnowledgeLayoutKind;
  isSystem: boolean;
  sortOrder: number;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeEntryMetadata = {
  price?: string;
  unit?: string;
  [key: string]: string | undefined;
};

export const SYSTEM_KNOWLEDGE_CATEGORY_SEEDS: Array<{
  name: KnowledgeCategoryId;
  slug: string;
  description: string;
  layoutKind: KnowledgeLayoutKind;
  sortOrder: number;
}> = [
  {
    name: "Services",
    slug: "services",
    description: "What you offer and how it works",
    layoutKind: "services",
    sortOrder: 10,
  },
  {
    name: "Pricing",
    slug: "pricing",
    description: "Rates and packages for your services",
    layoutKind: "pricing",
    sortOrder: 20,
  },
  {
    name: "FAQ",
    slug: "faq",
    description: "Common customer questions",
    layoutKind: "faq",
    sortOrder: 30,
  },
  {
    name: "Business Hours",
    slug: "business-hours",
    description: "Opening hours and availability",
    layoutKind: "hours",
    sortOrder: 40,
  },
  {
    name: "Address",
    slug: "address",
    description: "Locations and service areas",
    layoutKind: "address",
    sortOrder: 50,
  },
  {
    name: "Contact",
    slug: "contact",
    description: "Phone, email, and channels",
    layoutKind: "contact",
    sortOrder: 60,
  },
  {
    name: "Policies",
    slug: "policies",
    description: "Returns, privacy, and terms",
    layoutKind: "policies",
    sortOrder: 70,
  },
  {
    name: "Additional",
    slug: "additional",
    description: "Extra facts the AI should know",
    layoutKind: "generic",
    sortOrder: 80,
  },
];

export function slugifyKnowledgeCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "category";
}

export function inferLayoutKindFromName(name: string): KnowledgeLayoutKind {
  const normalized = name.trim().toLowerCase();
  if (/price|pricing|cost|tariff|rate/.test(normalized)) return "pricing";
  if (/faq|question/.test(normalized)) return "faq";
  if (/hour|schedule|open|time/.test(normalized)) return "hours";
  if (/address|location|office|branch|area/.test(normalized)) return "address";
  if (/contact|phone|email|support/.test(normalized)) return "contact";
  if (/policy|terms|privacy|return|refund/.test(normalized)) return "policies";
  if (/service|product|offer/.test(normalized)) return "services";
  return "generic";
}
