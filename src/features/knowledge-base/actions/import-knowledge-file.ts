"use server";

import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { extractTextFromDocument } from "@/lib/knowledge/extract-document-text";
import { parseKnowledgeEntriesFromText } from "@/services/knowledge-ai.service";
import { bulkCreateKnowledgeEntries } from "@/services/knowledge.service";
import type { KnowledgeImportParseResult } from "@/types/knowledge.types";

export async function importKnowledgeFileAction(input: {
  fileName: string;
  fileBase64: string;
}): Promise<KnowledgeImportParseResult> {
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

  let buffer: Buffer;

  try {
    buffer = Buffer.from(input.fileBase64, "base64");
  } catch {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid file data.",
      },
    };
  }

  const extracted = await extractTextFromDocument(buffer, input.fileName);

  if (!extracted.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: extracted.message,
      },
    };
  }

  const parsed = await parseKnowledgeEntriesFromText({
    businessId: business.id,
    text: extracted.text,
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
