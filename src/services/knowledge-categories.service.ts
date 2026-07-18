import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  inferLayoutKindFromName,
  slugifyKnowledgeCategory,
  SYSTEM_KNOWLEDGE_CATEGORY_SEEDS,
  type KnowledgeCategoryCard,
  type KnowledgeLayoutKind,
} from "@/types/knowledge-category.types";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
  layoutKind: z
    .enum([
      "services",
      "pricing",
      "faq",
      "hours",
      "contact",
      "address",
      "policies",
      "generic",
    ])
    .optional(),
});

function mapCategoryRow(
  row: {
    id: string;
    business_id: string;
    name: string;
    slug: string;
    description: string;
    layout_kind: string;
    is_system: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  },
  entryCount = 0,
): KnowledgeCategoryCard {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    layoutKind: row.layout_kind as KnowledgeLayoutKind,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    entryCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function revalidateKnowledgePaths(slug?: string): void {
  revalidatePath(DASHBOARD_ROUTES.aiAssistantKnowledge);
  revalidatePath(DASHBOARD_ROUTES.knowledgeBase);
  if (slug) {
    revalidatePath(DASHBOARD_ROUTES.aiAssistantKnowledgeCategory(slug));
  }
}

export async function ensureSystemKnowledgeCategories(
  businessId: string,
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("knowledge_categories")
    .select("slug")
    .eq("business_id", businessId);

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = SYSTEM_KNOWLEDGE_CATEGORY_SEEDS.filter(
    (seed) => !existingSlugs.has(seed.slug),
  );

  if (missing.length === 0) {
    return;
  }

  await admin.from("knowledge_categories").insert(
    missing.map((seed) => ({
      business_id: businessId,
      name: seed.name,
      slug: seed.slug,
      description: seed.description,
      layout_kind: seed.layoutKind,
      is_system: true,
      sort_order: seed.sortOrder,
    })),
  );
}

export async function listKnowledgeCategoryCards(
  businessId: string,
): Promise<KnowledgeCategoryCard[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  await ensureSystemKnowledgeCategories(businessId);

  const supabase = await createClient();
  const [{ data: categories }, { data: entries }] = await Promise.all([
    supabase
      .from("knowledge_categories")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("knowledge_base")
      .select("category")
      .eq("business_id", businessId),
  ]);

  const counts = new Map<string, number>();
  for (const entry of entries ?? []) {
    const key = entry.category;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (categories ?? []).map((row) =>
    mapCategoryRow(row, counts.get(row.name) ?? 0),
  );
}

export async function getKnowledgeCategoryBySlug(
  businessId: string,
  slug: string,
): Promise<KnowledgeCategoryCard | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  await ensureSystemKnowledgeCategories(businessId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("knowledge_categories")
    .select("*")
    .eq("business_id", businessId)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const { count } = await supabase
    .from("knowledge_base")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("category", data.name);

  return mapCategoryRow(data, count ?? 0);
}

export async function createKnowledgeCategory(input: {
  name: string;
  description?: string;
  layoutKind?: KnowledgeLayoutKind;
}): Promise<{ success: true; category: KnowledgeCategoryCard } | { success: false; message: string }> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid category." };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  await ensureSystemKnowledgeCategories(businessId);
  const supabase = await createClient();
  const baseSlug = slugifyKnowledgeCategory(parsed.data.name);
  let slug = baseSlug;
  let attempt = 1;

  while (attempt < 20) {
    const { data: clash } = await supabase
      .from("knowledge_categories")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const layoutKind =
    parsed.data.layoutKind ?? inferLayoutKindFromName(parsed.data.name);

  const { data, error } = await supabase
    .from("knowledge_categories")
    .insert({
      business_id: businessId,
      name: parsed.data.name.trim(),
      slug,
      description: parsed.data.description?.trim() || "Custom knowledge category",
      layout_kind: layoutKind,
      is_system: false,
      sort_order: 200 + attempt,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, message: error?.message ?? "Unable to create category." };
  }

  revalidateKnowledgePaths(data.slug);
  return { success: true, category: mapCategoryRow(data, 0) };
}

export async function deleteKnowledgeCategory(
  categoryId: string,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();
  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("knowledge_categories")
    .select("*")
    .eq("id", categoryId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!category) {
    return { success: false, message: "Category not found." };
  }

  if (category.is_system) {
    return { success: false, message: "System categories cannot be deleted." };
  }

  await supabase
    .from("knowledge_base")
    .delete()
    .eq("business_id", businessId)
    .eq("category", category.name);

  const { error } = await supabase
    .from("knowledge_categories")
    .delete()
    .eq("id", categoryId)
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateKnowledgePaths();
  return { success: true };
}

/** Clears all knowledge rows for a category card, keeping the card itself. */
export async function clearKnowledgeCategoryEntries(
  categoryId: string,
): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
  const businessId = await getOwnedBusinessId();
  if (!businessId || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("knowledge_categories")
    .select("*")
    .eq("id", categoryId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!category) {
    return { success: false, message: "Category not found." };
  }

  const { data: deleted, error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("business_id", businessId)
    .eq("category", category.name)
    .select("id");

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateKnowledgePaths(category.slug);
  return {
    success: true,
    deletedCount: deleted?.length ?? 0,
  };
}

/** Used by website sync / AI: ensure a category card exists for a free-form name. */
export async function ensureKnowledgeCategoryForName(
  businessId: string,
  name: string,
  options?: { layoutKind?: KnowledgeLayoutKind; description?: string },
): Promise<KnowledgeCategoryCard> {
  await ensureSystemKnowledgeCategories(businessId);
  const admin = createAdminClient();
  const trimmed = name.trim().slice(0, 80) || "Additional";

  const { data: existing } = await admin
    .from("knowledge_categories")
    .select("*")
    .eq("business_id", businessId)
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) {
    return mapCategoryRow(existing);
  }

  const slugBase = slugifyKnowledgeCategory(trimmed);
  let slug = slugBase;
  for (let attempt = 1; attempt < 30; attempt += 1) {
    const { data: clash } = await admin
      .from("knowledge_categories")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${slugBase}-${attempt + 1}`;
  }

  const { data, error } = await admin
    .from("knowledge_categories")
    .insert({
      business_id: businessId,
      name: trimmed,
      slug,
      description:
        options?.description?.trim() ||
        `Auto-created from website scan: ${trimmed}`,
      layout_kind: options?.layoutKind ?? inferLayoutKindFromName(trimmed),
      is_system: false,
      sort_order: 150,
    })
    .select("*")
    .single();

  if (error || !data) {
    // Fall back to Additional system card
    const { data: additional } = await admin
      .from("knowledge_categories")
      .select("*")
      .eq("business_id", businessId)
      .eq("slug", "additional")
      .maybeSingle();
    if (additional) return mapCategoryRow(additional);
    throw new Error(error?.message ?? "Unable to create knowledge category.");
  }

  return mapCategoryRow(data);
}
