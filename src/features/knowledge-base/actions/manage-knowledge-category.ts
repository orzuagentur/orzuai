"use server";

import {
  clearKnowledgeCategoryEntries,
  createKnowledgeCategory,
  deleteKnowledgeCategory,
} from "@/services/knowledge-categories.service";
import type { KnowledgeLayoutKind } from "@/types/knowledge-category.types";

export async function createKnowledgeCategoryAction(input: {
  name: string;
  description?: string;
  layoutKind?: KnowledgeLayoutKind;
}) {
  return createKnowledgeCategory(input);
}

export async function deleteKnowledgeCategoryAction(categoryId: string) {
  return deleteKnowledgeCategory(categoryId);
}

export async function clearKnowledgeCategoryEntriesAction(categoryId: string) {
  return clearKnowledgeCategoryEntries(categoryId);
}
