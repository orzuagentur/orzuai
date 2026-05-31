"use server";

import { deleteKnowledgeEntry } from "@/services/knowledge.service";
import type { DeleteKnowledgeEntryResult } from "@/types/knowledge.types";

export async function deleteKnowledgeEntryAction(
  entryId: string,
): Promise<DeleteKnowledgeEntryResult> {
  return deleteKnowledgeEntry(entryId);
}
