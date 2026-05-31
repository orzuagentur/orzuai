import { z } from "zod";

import type { KnowledgeCategory } from "./database.types";

export const KNOWLEDGE_CATEGORIES = [
  "Services",
  "Pricing",
  "FAQ",
  "Business Hours",
] as const satisfies readonly KnowledgeCategory[];

export const knowledgeCategorySchema = z.enum(KNOWLEDGE_CATEGORIES);

export const knowledgeEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(200, "Title must be at most 200 characters."),
  content: z
    .string()
    .trim()
    .min(10, "Content must be at least 10 characters.")
    .max(5000, "Content must be at most 5000 characters."),
  category: knowledgeCategorySchema,
});

export const updateKnowledgeEntrySchema = knowledgeEntrySchema.extend({
  entryId: z.string().uuid("Invalid knowledge entry identifier."),
});

export type KnowledgeEntryInput = z.infer<typeof knowledgeEntrySchema>;
export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;

export type KnowledgeEntryData = {
  id: string;
  businessId: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchFilters = {
  query?: string;
  category?: KnowledgeCategory | "";
};

export type KnowledgeErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "UNAUTHORIZED"
  | "NO_BUSINESS"
  | "NOT_FOUND"
  | "CREATE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";

export type KnowledgeActionError = {
  code: KnowledgeErrorCode;
  message: string;
};

export type KnowledgeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: KnowledgeActionError };

export type CreateKnowledgeEntryResult =
  KnowledgeActionResult<KnowledgeEntryData>;
export type UpdateKnowledgeEntryResult =
  KnowledgeActionResult<KnowledgeEntryData>;
export type DeleteKnowledgeEntryResult = KnowledgeActionResult<{ id: string }>;
