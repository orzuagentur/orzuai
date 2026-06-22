"use server";

import { z } from "zod";

import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { listCannedResponses } from "@/services/canned-responses.service";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";

const fetchCannedResponsesSchema = z.object({
  channel: z
    .enum([
      MESSAGING_INTEGRATION_CHANNELS[0],
      ...MESSAGING_INTEGRATION_CHANNELS.slice(1),
    ])
    .optional(),
});

export type FetchCannedResponsesInput = z.infer<
  typeof fetchCannedResponsesSchema
>;

export async function fetchCannedResponsesAction(
  input: FetchCannedResponsesInput = {},
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchCannedResponsesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: {
        message:
          parsed.error.issues[0]?.message ??
          CANNED_RESPONSES_MESSAGES.saveFailed,
      },
    };
  }

  const cannedResponses = await listCannedResponses(
    parsed.data.channel as MessagingIntegrationChannelId | undefined,
  );

  return {
    success: true as const,
    data: { cannedResponses },
  };
}
