import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { buildEmailReplySubject } from "@/utils/email-message";

type MessagingDbClient = SupabaseClient<Database>;

export async function resolveEmailReplySubjectForConversation(
  admin: MessagingDbClient,
  conversationId: string,
  channel: "email" | "outlook" = "email",
): Promise<string> {
  const { data } = await admin
    .from("messages")
    .select("content, email_subject, channel")
    .eq("conversation_id", conversationId)
    .eq("channel", channel)
    .eq("hidden_for_business", false)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const subject = row.email_subject?.trim();

    if (subject) {
      return buildEmailReplySubject(subject);
    }

    const legacyMatch = row.content.match(/^Subject:\s*(.+?)(?:\r?\n\r?\n|\n)/);

    if (legacyMatch?.[1]?.trim()) {
      return buildEmailReplySubject(legacyMatch[1].trim());
    }
  }

  return buildEmailReplySubject(null);
}
