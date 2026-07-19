"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SITE_CONTENT_CATALOG } from "@/features/site-content/catalog";
import type {
  SaveSiteDocumentInput,
  SiteDocumentRecord,
} from "@/features/site-content/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  collection: z.enum(["landing", "docs", "faq"]),
  docKey: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["en", "ru", "uz"]),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(2000),
  body: z.string().max(200_000),
  payload: z.record(z.string(), z.unknown()),
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
});

type Row = {
  id: string;
  collection: "landing" | "docs" | "faq";
  doc_key: string;
  locale: "en" | "ru" | "uz";
  title: string;
  summary: string;
  body: string;
  payload: Record<string, unknown> | null;
  sort_order: number;
  published: boolean;
  updated_at: string;
};

function mapRow(row: Row): SiteDocumentRecord {
  return {
    id: row.id,
    collection: row.collection,
    docKey: row.doc_key,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    body: row.body,
    payload: row.payload ?? {},
    sortOrder: row.sort_order,
    published: row.published,
    updatedAt: row.updated_at,
  };
}

export async function listSiteDocumentsAction(locale?: string): Promise<{
  documents: SiteDocumentRecord[];
  error?: string;
}> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    let query = admin
      .from("platform_site_documents")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (locale) {
      query = query.eq("locale", locale);
    }

    const { data, error } = await query;
    if (error) {
      return { documents: [], error: error.message };
    }

    return { documents: ((data ?? []) as Row[]).map(mapRow) };
  } catch (error) {
    return {
      documents: [],
      error: error instanceof Error ? error.message : "Failed to load documents",
    };
  }
}

export async function getSiteDocumentAction(
  id: string,
): Promise<{ document: SiteDocumentRecord | null; error?: string }> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("platform_site_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { document: null, error: error.message };
    }

    return { document: data ? mapRow(data as Row) : null };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : "Failed to load document",
    };
  }
}

export async function saveSiteDocumentAction(
  input: SaveSiteDocumentInput,
): Promise<{ document?: SiteDocumentRecord; error?: string }> {
  try {
    await requirePlatformAdmin();
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const admin = createServiceRoleClient();
    const row = {
      collection: parsed.data.collection,
      doc_key: parsed.data.docKey,
      locale: parsed.data.locale,
      title: parsed.data.title,
      summary: parsed.data.summary,
      body: parsed.data.body,
      payload: parsed.data.payload,
      sort_order: parsed.data.sortOrder,
      published: parsed.data.published,
      updated_at: new Date().toISOString(),
    };

    const query = parsed.data.id
      ? admin
          .from("platform_site_documents")
          .update(row)
          .eq("id", parsed.data.id)
          .select("*")
          .single()
      : admin.from("platform_site_documents").insert(row).select("*").single();

    const { data, error } = await query;
    if (error) {
      return { error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/docs");
    revalidatePath("/content");

    return { document: mapRow(data as Row) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save document",
    };
  }
}

export async function deleteSiteDocumentAction(
  id: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("platform_site_documents")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/docs");
    revalidatePath("/content");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete",
    };
  }
}

/** Create missing catalog documents for a locale from empty templates. */
export async function ensureSiteContentCatalogAction(
  locale: "en" | "ru" | "uz" = "en",
): Promise<{ created: number; error?: string }> {
  try {
    await requirePlatformAdmin();
    const admin = createServiceRoleClient();
    const { data: existing } = await admin
      .from("platform_site_documents")
      .select("collection, doc_key")
      .eq("locale", locale);

    const existingKeys = new Set(
      (existing ?? []).map(
        (row: { collection: string; doc_key: string }) =>
          `${row.collection}:${row.doc_key}`,
      ),
    );

    const toInsert = SITE_CONTENT_CATALOG.filter(
      (item) => !existingKeys.has(`${item.collection}:${item.docKey}`),
    ).map((item, index) => ({
      collection: item.collection,
      doc_key: item.docKey,
      locale,
      title: item.title,
      summary: item.description,
      body: "",
      payload: {},
      sort_order: (index + 1) * 10,
      published: true,
    }));

    if (toInsert.length === 0) {
      return { created: 0 };
    }

    const { error } = await admin.from("platform_site_documents").insert(toInsert);
    if (error) {
      return { created: 0, error: error.message };
    }

    return { created: toInsert.length };
  } catch (error) {
    return {
      created: 0,
      error: error instanceof Error ? error.message : "Seed failed",
    };
  }
}
