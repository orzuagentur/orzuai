import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DocsArticle } from "@/features/docs/types";
import type { LandingCopy, LandingLocale } from "@/features/landing/i18n";

type SiteDocRow = {
  collection: "landing" | "docs" | "faq";
  doc_key: string;
  locale: string;
  title: string;
  summary: string;
  body: string;
  payload: Record<string, unknown> | null;
  published: boolean;
};

export type PublicSiteDocument = {
  collection: SiteDocRow["collection"];
  docKey: string;
  locale: string;
  title: string;
  summary: string;
  body: string;
  payload: Record<string, unknown>;
};

async function listPublishedDocuments(
  locale: LandingLocale,
): Promise<PublicSiteDocument[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_site_documents")
      .select("collection, doc_key, locale, title, summary, body, payload, published")
      .eq("published", true)
      .eq("locale", locale);

    if (error || !data) return [];

    return (data as SiteDocRow[]).map((row) => ({
      collection: row.collection,
      docKey: row.doc_key,
      locale: row.locale,
      title: row.title,
      summary: row.summary,
      body: row.body,
      payload: row.payload ?? {},
    }));
  } catch {
    return [];
  }
}

function findDoc(
  docs: PublicSiteDocument[],
  collection: PublicSiteDocument["collection"],
  docKey: string,
) {
  return docs.find((doc) => doc.collection === collection && doc.docKey === docKey);
}

/** Merge CMS overrides onto static landing copy. Empty CMS keeps defaults. */
export function applyLandingContentOverrides(
  copy: LandingCopy,
  docs: PublicSiteDocument[],
): LandingCopy {
  const next = structuredClone(copy);

  const hero = findDoc(docs, "landing", "hero");
  if (hero) {
    if (hero.title.trim()) next.hero.title = hero.title;
    // Supporting text comes from the summary field. Body is intentionally not
    // mapped to the subtitle so the long-form editor field cannot clobber it.
    if (hero.summary.trim()) next.hero.subtitle = hero.summary;
  }

  const architecture = findDoc(docs, "landing", "architecture");
  if (architecture) {
    const p = architecture.payload;
    if (architecture.title.trim()) next.architecture.title = architecture.title;
    if (architecture.summary.trim()) next.architecture.subtitle = architecture.summary;
    if (typeof p.eyebrow === "string" && p.eyebrow) next.architecture.eyebrow = p.eyebrow;
    if (typeof p.lead === "string") next.architecture.lead = p.lead;
    if (typeof p.outcomeTitle === "string") next.architecture.outcomeTitle = p.outcomeTitle;
    if (typeof p.outcomeBody === "string") next.architecture.outcomeBody = p.outcomeBody;
    if (Array.isArray(p.nodes) && p.nodes.length > 0) {
      next.architecture.nodes = p.nodes as LandingCopy["architecture"]["nodes"];
    }
    if (Array.isArray(p.principles)) {
      next.architecture.principles = p.principles as NonNullable<
        LandingCopy["architecture"]["principles"]
      >;
    }
  }

  const enterprise = findDoc(docs, "landing", "enterprise");
  if (enterprise) {
    const p = enterprise.payload;
    if (enterprise.title.trim()) next.enterprise.title = enterprise.title;
    if (enterprise.summary.trim()) next.enterprise.subtitle = enterprise.summary;
    if (typeof p.eyebrow === "string" && p.eyebrow) next.enterprise.eyebrow = p.eyebrow;
    if (typeof p.honestyNote === "string") next.enterprise.honestyNote = p.honestyNote;
    if (typeof p.checklistTitle === "string") {
      next.enterprise.checklistTitle = p.checklistTitle;
    }
    if (Array.isArray(p.checklist)) {
      next.enterprise.checklist = p.checklist as string[];
    }
    if (Array.isArray(p.pillars) && p.pillars.length > 0) {
      next.enterprise.pillars = p.pillars as LandingCopy["enterprise"]["pillars"];
    }
  }

  const pricing = findDoc(docs, "landing", "pricing");
  if (pricing) {
    if (pricing.title.trim()) next.pricing.title = pricing.title;
    if (pricing.summary.trim()) next.pricing.subtitle = pricing.summary;
    if (pricing.body.trim()) next.pricing.note = pricing.body;
  }

  const faq = findDoc(docs, "faq", "main");
  if (faq) {
    if (faq.title.trim()) next.faq.title = faq.title;
    if (faq.summary.trim()) next.faq.subtitle = faq.summary;
    const items = faq.payload.items;
    if (Array.isArray(items) && items.length > 0) {
      next.faq.items = items as LandingCopy["faq"]["items"];
    }
  }

  return next;
}

export async function getLandingCopyWithCms(
  locale: LandingLocale,
  base: LandingCopy,
): Promise<LandingCopy> {
  const docs = await listPublishedDocuments(locale);
  if (docs.length === 0) return base;
  return applyLandingContentOverrides(base, docs);
}

export async function getCmsDocsArticle(
  slug: string,
  locale: LandingLocale = "en",
): Promise<DocsArticle | null> {
  const docs = await listPublishedDocuments(locale);
  const doc = findDoc(docs, "docs", slug);
  if (!doc) return null;

  const sectionsRaw = doc.payload.sections;
  if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
    if (!doc.body.trim() && !doc.title.trim()) return null;
    return {
      slug,
      title: doc.title || slug,
      summary: doc.summary,
      updatedLabel: "Updated from Content Studio",
      sections: doc.body.trim()
        ? [{ heading: "Overview", body: [doc.body] }]
        : [],
    };
  }

  const sections = sectionsRaw.map((section) => {
    const row = section as {
      heading?: string;
      body?: string;
      bulletsText?: string;
    };
    const bodyText = String(row.body ?? "").trim();
    const bullets = String(row.bulletsText ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      heading: String(row.heading ?? "Section"),
      body: bodyText ? bodyText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) : [],
      bullets: bullets.length > 0 ? bullets : undefined,
    };
  });

  return {
    slug,
    title: doc.title,
    summary: doc.summary,
    updatedLabel: "Updated from Content Studio",
    sections,
  };
}
