"use server";

import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateKnowledgeEntriesFromBusiness } from "@/services/knowledge-ai.service";
import {
  bulkCreateKnowledgeEntries,
  listKnowledgeEntries,
} from "@/services/knowledge.service";
import type { KnowledgeAiGenerateResult } from "@/types/knowledge.types";

export async function generateKnowledgeAiAction(input?: {
  hints?: string;
  replaceExisting?: boolean;
}): Promise<KnowledgeAiGenerateResult> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: "Create your business profile before generating knowledge.",
      },
    };
  }

  const generated = await generateKnowledgeEntriesFromBusiness({
    businessId: business.id,
    business,
    hints: input?.hints,
  });

  if (!generated.success) {
    return {
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: generated.message,
      },
    };
  }

  if (input?.replaceExisting) {
    const existing = await listKnowledgeEntries(business.id);
    const manualIds = existing
      .filter((entry) => entry.source === "manual")
      .map((entry) => entry.id);

    if (manualIds.length > 0) {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath } = await import("next/cache");
      const { DASHBOARD_ROUTES } = await import("@/constants/routes");
      const supabase = await createClient();
      await supabase
        .from("knowledge_base")
        .delete()
        .eq("business_id", business.id)
        .in("id", manualIds);
      revalidatePath(DASHBOARD_ROUTES.aiAssistant);
      revalidatePath(DASHBOARD_ROUTES.knowledgeBase);
    }
  }

  const saved = await bulkCreateKnowledgeEntries(generated.entries);

  if (!saved.success) {
    return saved;
  }

  return {
    success: true,
    data: {
      entries: saved.data.entries.map((entry) => ({
        title: entry.title,
        content: entry.content,
        category: entry.category,
      })),
      created: saved.data.created,
    },
  };
}
