"use server";

import { updateKnowledgeEntry } from "@/services/knowledge.service";
import type {
  KnowledgeEntryInput,
  UpdateKnowledgeEntryResult,
} from "@/types/knowledge.types";

export async function updateKnowledgeEntryAction(
  entryId: string,
  input: KnowledgeEntryInput,
): Promise<UpdateKnowledgeEntryResult> {
  return updateKnowledgeEntry(entryId, input);
}
