"use server";

import { createKnowledgeEntry } from "@/services/knowledge.service";
import type {
  CreateKnowledgeEntryResult,
  KnowledgeEntryInput,
} from "@/types/knowledge.types";

export async function createKnowledgeEntryAction(
  input: KnowledgeEntryInput,
): Promise<CreateKnowledgeEntryResult> {
  return createKnowledgeEntry(input);
}
