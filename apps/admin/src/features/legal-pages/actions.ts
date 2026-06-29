"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DEFAULT_LEGAL_PAGES, isReservedLegalSlug } from "@/features/legal-pages/defaults";
import type { LegalPageRecord, LegalSection, SaveLegalPageInput } from "@/features/legal-pages/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const sectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  paragraphs: z.array(z.string().trim().min(1).max(4000)).min(1).max(20),
  list: z.array(z.string().trim().min(1).max(2000)).max(30).optional(),
});

const saveLegalPageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: только латиница, цифры и дефис"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500),
  footerLabel: z.string().trim().min(1).max(120),
  sections: z.array(sectionSchema).min(1).max(30),
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
  showInFooter: z.boolean(),
});

const deleteLegalPageSchema = z.object({
  id: z.string().uuid(),
});

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

async function seedDefaultLegalPagesIfEmpty(): Promise<void> {
  const service = createServiceRoleClient();
  const { count } = await service
    .from("platform_legal_pages")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    return;
  }

  await service.from("platform_legal_pages").insert(
    DEFAULT_LEGAL_PAGES.map((page) => ({
      slug: page.slug,
      title: page.title,
      description: page.description,
      footer_label: page.footerLabel,
      sections: page.sections,
      sort_order: page.sortOrder,
      published: page.published,
      show_in_footer: page.showInFooter,
    })),
  );
}

export async function fetchLegalPagesAction(): Promise<{
  pages: LegalPageRecord[];
}> {
  await requirePlatformAdmin();
  await seedDefaultLegalPagesIfEmpty();

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("platform_legal_pages")
    .select(
      "id, slug, title, description, footer_label, sections, sort_order, published, show_in_footer, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return { pages: (data ?? []).map(mapRow) };
}

export async function saveLegalPageAction(
  input: SaveLegalPageInput,
): Promise<{ success: boolean; message?: string; page?: LegalPageRecord }> {
  await requirePlatformAdmin();

  const parsed = saveLegalPageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  if (isReservedLegalSlug(parsed.data.slug)) {
    return {
      success: false,
      message: "Этот URL зарезервирован системой. Выберите другой slug.",
    };
  }

  const service = createServiceRoleClient();

  if (!parsed.data.id) {
    const { data: existing } = await service
      .from("platform_legal_pages")
      .select("id")
      .eq("slug", parsed.data.slug)
      .maybeSingle();

    if (existing) {
      return { success: false, message: "Страница с таким slug уже существует." };
    }
  }

  const payload = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    footer_label: parsed.data.footerLabel,
    sections: parsed.data.sections,
    sort_order: parsed.data.sortOrder,
    published: parsed.data.published,
    show_in_footer: parsed.data.showInFooter,
  };

  if (parsed.data.id) {
    const { data, error } = await service
      .from("platform_legal_pages")
      .update(payload)
      .eq("id", parsed.data.id)
      .select(
        "id, slug, title, description, footer_label, sections, sort_order, published, show_in_footer, updated_at",
      )
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/legal-pages");
    return { success: true, page: mapRow(data) };
  }

  const { data, error } = await service
    .from("platform_legal_pages")
    .insert(payload)
    .select(
      "id, slug, title, description, footer_label, sections, sort_order, published, show_in_footer, updated_at",
    )
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/legal-pages");
  return { success: true, page: mapRow(data) };
}

export async function deleteLegalPageAction(input: {
  id: string;
}): Promise<{ success: boolean; message?: string }> {
  await requirePlatformAdmin();

  const parsed = deleteLegalPageSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Некорректный идентификатор." };
  }

  const service = createServiceRoleClient();
  const { error } = await service
    .from("platform_legal_pages")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/legal-pages");
  return { success: true };
}
