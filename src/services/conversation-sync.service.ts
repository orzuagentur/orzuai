import "server-only";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function updateConversationSyncCursor(
  admin: MessagingDbClient,
  input: {
    conversationId: string;
    businessId: string;
    lastMessageAt: string;
    lastMessageId: string;
  },
): Promise<void> {
  const { error } = await admin
    .from("conversations")
    .update({
      last_sync_message_at: input.lastMessageAt,
      last_sync_message_id: input.lastMessageId,
    })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId);

  if (error) {
    console.error("[conversation-sync] cursor update failed", error.message);
  }
}
