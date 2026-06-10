import { z } from "zod";

import { AI_PROVIDERS } from "@/lib/ai/constants";
import type { MessagingChannel } from "./database.types";

const messagingChannelSchema = z.enum([
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
]);

export const createAiAgentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000),
  channels: z.array(messagingChannelSchema).min(1, "Select at least one channel."),
  triggerKeywords: z.array(z.string().trim().min(1).max(40)).max(20),
  enabled: z.boolean().default(true),
  provider: z.enum(AI_PROVIDERS).default("gemini"),
  model: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1).max(32),
});

export const updateAiAgentSchema = createAiAgentSchema.extend({
  id: z.string().uuid(),
});

export const deleteAiAgentSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAiAgentInput = z.infer<typeof createAiAgentSchema>;
export type UpdateAiAgentInput = z.infer<typeof updateAiAgentSchema>;
export type DeleteAiAgentInput = z.infer<typeof deleteAiAgentSchema>;

export type AiAgentItem = {
  id: string;
  name: string;
  systemPrompt: string;
  channels: MessagingChannel[];
  triggerKeywords: string[];
  enabled: boolean;
  provider: string;
  model: string;
  language: string;
  createdAt: string;
  updatedAt: string;
};

export type AiAgentActionResult =
  | { success: true; id?: string }
  | { success: false; error: { code: string; message: string } };
