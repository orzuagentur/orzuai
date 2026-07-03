"use server";

import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { parseKnowledgeEntriesFromText } from "@/services/knowledge-ai.service";
import { bulkCreateKnowledgeEntries } from "@/services/knowledge.service";
import type { KnowledgeImportParseResult } from "@/types/knowledge.types";

export async function importKnowledgeTextAction(input: {
  text: string;
}): Promise<KnowledgeImportParseResult> {
  const trimmed = input.text?.trim() ?? "";

  if (trimmed.length < 20) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Paste at least 20 characters to import.",
      },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: "Create your business profile before importing knowledge.",
      },
    };
  }

  const parsed = await parseKnowledgeEntriesFromText({
    businessId: business.id,
    text: trimmed,
    business,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: parsed.message,
      },
    };
  }

  const saved = await bulkCreateKnowledgeEntries(parsed.entries);

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
