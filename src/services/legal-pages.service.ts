import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_LEGAL_PAGES,
  legalPagePath,
} from "@/features/legal/default-pages";
import type { LegalFooterLink, LegalPageRecord, LegalSection } from "@/features/legal/types";

function mapRow(row: {
  id: string;
  slug: string;
  title: string;
  description: string;
  footer_label: string;
  sections: unknown;
  sort_order: number;
  published: boolean;
  show_in_footer: boolean;
  updated_at: string;
}): LegalPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    footerLabel: row.footer_label,
    sections: Array.isArray(row.sections) ? (row.sections as LegalSection[]) : [],
    sortOrder: row.sort_order,
    published: row.published,
    showInFooter: row.show_in_footer,
    updatedAt: row.updated_at,
  };
}

function defaultPagesAsRecords(): LegalPageRecord[] {
  const now = new Date().toISOString();

  return DEFAULT_LEGAL_PAGES.map((page, index) => ({
    ...page,
    id: `default-${page.slug}`,
    updatedAt: now,
    sortOrder: page.sortOrder ?? index * 10,
  }));
}

async function queryPublishedPages(): Promise<LegalPageRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_legal_pages")
      .select(
        "id, slug, title, description, footer_label, sections, sort_order, published, show_in_footer, updated_at",
      )
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (error || !data?.length) {
      return defaultPagesAsRecords().filter((page) => page.published);
    }

    return data.map(mapRow);
  } catch {
    return defaultPagesAsRecords().filter((page) => page.published);
  }
}

export async function listPublishedLegalPages(): Promise<LegalPageRecord[]> {
  return queryPublishedPages();
}

export async function listFooterLegalLinks(): Promise<LegalFooterLink[]> {
  const pages = await queryPublishedPages();

  return pages
    .filter((page) => page.showInFooter)
    .map((page) => ({
      href: legalPagePath(page.slug),
      label: page.footerLabel,
    }));
}

export async function getPublishedLegalPageBySlug(
  slug: string,
): Promise<LegalPageRecord | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_legal_pages")
      .select(
        "id, slug, title, description, footer_label, sections, sort_order, published, show_in_footer, updated_at",
      )
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error || !data) {
      const fallback = defaultPagesAsRecords().find(
        (page) => page.slug === slug && page.published,
      );
      return fallback ?? null;
    }

    return mapRow(data);
  } catch {
    const fallback = defaultPagesAsRecords().find(
      (page) => page.slug === slug && page.published,
    );
    return fallback ?? null;
  }
}

export async function listPublishedLegalSlugs(): Promise<string[]> {
  const pages = await queryPublishedPages();
  return pages.map((page) => page.slug);
}
