import { z } from "zod";

import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

const messagingChannelSchema = z.enum([
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
]);

export const createCannedResponseSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  content: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(4096, "Message is too long."),
  channel: messagingChannelSchema.optional().nullable(),
});

export const updateCannedResponseSchema = createCannedResponseSchema.extend({
  id: z.string().uuid("Invalid canned response identifier."),
});

export const deleteCannedResponseSchema = z.object({
  id: z.string().uuid("Invalid canned response identifier."),
});

export type CreateCannedResponseInput = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseInput = z.infer<typeof updateCannedResponseSchema>;
export type DeleteCannedResponseInput = z.infer<typeof deleteCannedResponseSchema>;

export type CannedResponseItem = {
  id: string;
  title: string;
  content: string;
  channel: MessagingIntegrationChannelId | null;
  createdAt: string;
  updatedAt: string;
};

export type CannedResponseActionResult =
  | { success: true }
  | { success: false; error: { code: string; message: string } };
