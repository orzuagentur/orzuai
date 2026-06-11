import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { buildConversationLastMessageUpdate } from "@/utils/conversation-last-message";
type DbClient = SupabaseClient<Database>;

export async function recomputeConversationLastMessage(
  client: DbClient,
  conversationId: string,
): Promise<void> {
  const { data: latest } = await client
    .from("messages")
    .select("content, created_at, sender_type, ai_generated")
    .eq("conversation_id", conversationId)
    .eq("hidden_for_business", false)
    .is("deleted_for_all_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    await client
      .from("conversations")
      .update({
        last_message_preview: null,
        last_message_at: null,
        last_message_sender_type: null,
        last_message_ai_generated: false,
      })
      .eq("id", conversationId);
    return;
  }

  const { data: latestClient } = await client
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "client")
    .eq("hidden_for_business", false)
    .is("deleted_for_all_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await client
    .from("conversations")
    .update(
      buildConversationLastMessageUpdate({
        content: latest.content,
        senderType: latest.sender_type,
        aiGenerated: latest.ai_generated,
        createdAt: latest.created_at,
        previousLastClientMessageAt: latestClient?.created_at ?? null,
      }),
    )
    .eq("id", conversationId);
}

export async function updateConversationLastMessageFromInsert(
  client: DbClient,
  input: {
    conversationId: string;
    content: string;
    senderType: Database["public"]["Tables"]["messages"]["Row"]["sender_type"];
    aiGenerated?: boolean;
    createdAt: string;
  },
): Promise<void> {
  const { data: conversation } = await client
    .from("conversations")
    .select("last_client_message_at")
    .eq("id", input.conversationId)
    .maybeSingle();

  await client
    .from("conversations")
    .update(
      buildConversationLastMessageUpdate({
        content: input.content,
        senderType: input.senderType,
        aiGenerated: input.aiGenerated,
        createdAt: input.createdAt,
        previousLastClientMessageAt: conversation?.last_client_message_at ?? null,
      }),
    )
    .eq("id", input.conversationId);
}

export async function recomputeConversationLastMessageForBusiness(
  conversationId: string,
  businessId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return;
  }

  await recomputeConversationLastMessage(supabase, conversationId);
}
