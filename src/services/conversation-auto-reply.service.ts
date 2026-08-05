import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

export async function pauseConversationAutoReply(
  admin: MessagingDbClient,
  input: { businessId: string; conversationId: string },
): Promise<void> {
  const { error } = await admin
    .from("conversations")
    .update({ ai_auto_reply_paused: true })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId);

  if (error) {
    console.warn(
      "[conversation-auto-reply] pause failed",
      error.message,
      input.conversationId,
    );
  }
}

export async function resumeConversationAutoReply(
  admin: MessagingDbClient,
  input: { businessId: string; conversationId: string },
): Promise<void> {
  const { error } = await admin
    .from("conversations")
    .update({ ai_auto_reply_paused: false })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId);

  if (error) {
    console.warn(
      "[conversation-auto-reply] resume failed",
      error.message,
      input.conversationId,
    );
  }
}

export async function isConversationAutoReplyBlocked(
  admin: MessagingDbClient,
  input: { businessId: string; conversationId: string },
): Promise<{ blocked: boolean; reason?: "paused" | "pending_handoff" }> {
  const [{ data: conversation }, { data: pendingRequest }] = await Promise.all([
    admin
      .from("conversations")
      .select("ai_auto_reply_paused")
      .eq("id", input.conversationId)
      .eq("business_id", input.businessId)
      .maybeSingle(),
    admin
      .from("ai_human_requests")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("conversation_id", input.conversationId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
  ]);

  if (conversation?.ai_auto_reply_paused) {
    return { blocked: true, reason: "paused" };
  }

  if (pendingRequest) {
    return { blocked: true, reason: "pending_handoff" };
  }

  return { blocked: false };
}
