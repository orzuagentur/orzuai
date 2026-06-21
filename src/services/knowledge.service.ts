import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { KNOWLEDGE_MESSAGES } from "@/features/knowledge-base/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { KnowledgeCategory } from "@/types/database.types";
import type {
  CreateKnowledgeEntryResult,
  DeleteKnowledgeEntryResult,
  KnowledgeEntryData,
  KnowledgeEntryInput,
  KnowledgeSearchFilters,
  UpdateKnowledgeEntryResult,
} from "@/types/knowledge.types";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeEntrySchema,
  updateKnowledgeEntrySchema,
} from "@/types/knowledge.types";
import {
  buildKnowledgeSearchPattern,
  mapKnowledgeEntry,
} from "@/utils/knowledge";
import { storeKnowledgeEntryEmbedding } from "@/services/knowledge-embedding.service";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: KNOWLEDGE_MESSAGES.missingConfig,
    },
  };
}

function revalidateKnowledgePath(): void {
  revalidatePath(DASHBOARD_ROUTES.knowledgeBase);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function verifyEntryOwnership(entryId: string): Promise<{
  businessId: string;
} | null> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("knowledge_base")
    .select("id, business_id")
    .eq("id", entryId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return { businessId: data.business_id };
}

export async function listKnowledgeEntries(
  businessId: string,
  filters: KnowledgeSearchFilters = {},
): Promise<KnowledgeEntryData[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("knowledge_base")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  const searchQuery = filters.query?.trim();

  if (searchQuery) {
    const pattern = buildKnowledgeSearchPattern(searchQuery);
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  if (filters.category && KNOWLEDGE_CATEGORIES.includes(filters.category)) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(mapKnowledgeEntry);
}

export async function createKnowledgeEntry(
  input: KnowledgeEntryInput,
): Promise<CreateKnowledgeEntryResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = knowledgeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: KNOWLEDGE_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .insert({
      business_id: businessId,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: error?.message || KNOWLEDGE_MESSAGES.genericError,
      },
    };
  }

  const admin = createAdminClient();
  void storeKnowledgeEntryEmbedding(admin, {
    entryId: data.id,
    businessId,
    title: data.title,
    content: data.content,
    category: data.category,
  });

  revalidateKnowledgePath();

  return {
    success: true,
    data: mapKnowledgeEntry(data),
  };
}

export async function updateKnowledgeEntry(
  entryId: string,
  input: KnowledgeEntryInput,
): Promise<UpdateKnowledgeEntryResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = updateKnowledgeEntrySchema.safeParse({
    entryId,
    ...input,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const ownership = await verifyEntryOwnership(entryId);

  if (!ownership) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: KNOWLEDGE_MESSAGES.notFound,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .update({
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
    })
    .eq("id", entryId)
    .eq("business_id", ownership.businessId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: error?.message || KNOWLEDGE_MESSAGES.genericError,
      },
    };
  }

  const admin = createAdminClient();
  void storeKnowledgeEntryEmbedding(admin, {
    entryId: data.id,
    businessId: ownership.businessId,
    title: data.title,
    content: data.content,
    category: data.category,
  });

  revalidateKnowledgePath();

  return {
    success: true,
    data: mapKnowledgeEntry(data),
  };
}

export async function deleteKnowledgeEntry(
  entryId: string,
): Promise<DeleteKnowledgeEntryResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const ownership = await verifyEntryOwnership(entryId);

  if (!ownership) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: KNOWLEDGE_MESSAGES.notFound,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_base")
    .delete()
    .eq("id", entryId)
    .eq("business_id", ownership.businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: error.message || KNOWLEDGE_MESSAGES.deleteError,
      },
    };
  }

  revalidateKnowledgePath();

  return {
    success: true,
    data: { id: entryId },
  };
}

export function parseKnowledgeCategory(
  value: string | undefined,
): KnowledgeCategory | "" {
  if (!value) {
    return "";
  }

  return KNOWLEDGE_CATEGORIES.includes(value as KnowledgeCategory)
    ? (value as KnowledgeCategory)
    : "";
}
