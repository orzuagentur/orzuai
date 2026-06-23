import "server-only";

import { enrichChatMessages } from "@/services/message-enrichment.service";
import type { ChatMessageData } from "@/types/chat.types";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mapChatMessage, withPendingDeliveryStatus } from "@/utils/chat";

type MessagingDbClient = SupabaseClient<Database>;

type OutboundMessageRow = {
  id: string;
  conversation_id: string;
  channel: Database["public"]["Tables"]["messages"]["Row"]["channel"];
  sender_type: Database["public"]["Tables"]["messages"]["Row"]["sender_type"];
  content: string;
  email_subject?: string | null;
  ai_generated: boolean;
  created_at: string;
  deleted_for_all_at?: string | null;
  hidden_for_business?: boolean;
  edited_at?: string | null;
  is_edited?: boolean;
};

export function buildPendingOutboundChatMessage(
  row: OutboundMessageRow,
): ChatMessageData {
  return withPendingDeliveryStatus(mapChatMessage(row));
}

export async function buildOutboundChatMessage(
  admin: MessagingDbClient,
  row: OutboundMessageRow,
): Promise<ChatMessageData> {
  const mapped = mapChatMessage(row);
  const [enriched] = await enrichChatMessages(admin, [mapped]);

  return enriched ?? withPendingDeliveryStatus(mapped);
}
