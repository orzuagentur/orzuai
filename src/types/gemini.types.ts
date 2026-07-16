import { z } from "zod";

import {
  GEMINI_MAX_HISTORY_MESSAGES,
  GEMINI_MAX_KNOWLEDGE_ENTRIES,
  GEMINI_MAX_MESSAGE_LENGTH,
  GEMINI_MAX_SYSTEM_PROMPT_LENGTH,
} from "@/lib/gemini/constants";

export const geminiConversationRoleSchema = z.enum(["user", "assistant"]);

export const geminiKnowledgeContextSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(100),
  citation: z.string().trim().min(1).max(40).optional(),
  id: z.string().uuid().optional(),
});

export const geminiConversationMessageSchema = z.object({
  role: geminiConversationRoleSchema,
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(GEMINI_MAX_MESSAGE_LENGTH, "Message is too long"),
});

export const generateAssistantReplySchema = z.object({
  model: z.string().trim().min(1).max(100).optional(),
  systemPrompt: z
    .string()
    .trim()
    .min(1, "System prompt is required")
    .max(
      GEMINI_MAX_SYSTEM_PROMPT_LENGTH,
      "System prompt exceeds maximum length",
    ),
  language: z.string().trim().min(2).max(50),
  userMessage: z
    .string()
    .trim()
    .min(1, "User message is required")
    .max(GEMINI_MAX_MESSAGE_LENGTH, "User message is too long"),
  knowledgeContext: z
    .array(geminiKnowledgeContextSchema)
    .max(GEMINI_MAX_KNOWLEDGE_ENTRIES)
    .optional(),
  conversationHistory: z
    .array(geminiConversationMessageSchema)
    .max(GEMINI_MAX_HISTORY_MESSAGES)
    .optional(),
});

export const generateTextSchema = z.object({
  model: z.string().trim().min(1).max(100).optional(),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(GEMINI_MAX_MESSAGE_LENGTH, "Prompt is too long"),
  systemInstruction: z
    .string()
    .trim()
    .max(GEMINI_MAX_SYSTEM_PROMPT_LENGTH)
    .optional(),
});

export type GeminiKnowledgeContext = z.infer<
  typeof geminiKnowledgeContextSchema
>;

export type GeminiConversationMessage = z.infer<
  typeof geminiConversationMessageSchema
>;

export type GenerateAssistantReplyInput = z.infer<
  typeof generateAssistantReplySchema
>;

export type GenerateTextInput = z.infer<typeof generateTextSchema>;

export type GeminiServiceErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "GENERATION_FAILED"
  | "CONTENT_BLOCKED"
  | "EMPTY_RESPONSE";

export type GeminiGenerationSuccess = {
  text: string;
  model: string;
};

export type GeminiServiceResult =
  | { success: true; data: GeminiGenerationSuccess }
  | {
      success: false;
      error: {
        code: GeminiServiceErrorCode;
        message: string;
      };
    };
