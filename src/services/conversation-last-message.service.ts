import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageRepository } from "@/repositories/message.repository";
import type { Database } from "@/types/database.types";
import { buildConversationLastMessageUpdate } from "@/utils/conversation-last-message";

type DbClient = SupabaseClient<Database>;

export async function recomputeConversationLastMessage(
  client: DbClient,
  conversationId: string,
): Promise<void> {
  const messageRepo = getMessageRepository(client);
  const conversationRepo = getConversationRepository(client);
  const latest = await messageRepo.findLatestVisibleMessage(conversationId);

  if (!latest) {
    await conversationRepo.updateLastMessageFields(conversationId, {
      last_message_preview: null,
      last_message_at: null,
      last_message_sender_type: null,
      last_message_ai_generated: false,
    });
    return;
  }

  const latestClientSentAt =
    await messageRepo.findLatestClientMessageSentAt(conversationId);

  await conversationRepo.updateLastMessageFields(
    conversationId,
    buildConversationLastMessageUpdate({
      content: latest.content,
      senderType: latest.sender_type,
      aiGenerated: latest.ai_generated,
      createdAt: latest.sent_at,
      previousLastClientMessageAt: latestClientSentAt,
    }),
  );
}

export async function updateConversationLastMessageFromInsert(
  client: DbClient,
  input: {
    conversationId: string;
    content: string;
    channel?: Database["public"]["Tables"]["messages"]["Row"]["channel"];
    emailSubject?: string | null;
    senderType: Database["public"]["Tables"]["messages"]["Row"]["sender_type"];
    aiGenerated?: boolean;
    createdAt: string;
  },
): Promise<void> {
  const conversationRepo = getConversationRepository(client);
  const previousLastClientMessageAt =
    await conversationRepo.findLastClientMessageAt(input.conversationId);

  await conversationRepo.updateLastMessageFields(
    input.conversationId,
    buildConversationLastMessageUpdate({
      content: input.content,
      channel: input.channel,
      emailSubject: input.emailSubject,
      senderType: input.senderType,
      aiGenerated: input.aiGenerated,
      createdAt: input.createdAt,
      previousLastClientMessageAt,
    }),
  );
}

export async function recomputeConversationLastMessageForBusiness(
  conversationId: string,
  businessId: string,
): Promise<void> {
  const supabase = await createClient();
  const conversation = await getConversationRepository(supabase).assertOwnedByBusiness(
    conversationId,
    businessId,
  );

  if (!conversation) {
    return;
  }

  await recomputeConversationLastMessage(supabase, conversationId);
}
