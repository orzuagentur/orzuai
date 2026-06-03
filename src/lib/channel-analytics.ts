import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { MessagingChannel } from "@/types/channel-workspace.types";

type AdminClient = SupabaseClient<Database>;

export async function incrementChannelAnalytics(
  client: AdminClient,
  businessId: string,
  channel: MessagingChannel,
  updates: {
    totalMessages?: number;
    totalContacts?: number;
    aiReplies?: number;
  },
): Promise<void> {
  const { data: row } = await client
    .from("channel_analytics")
    .select("total_messages, total_contacts, ai_replies")
    .eq("business_id", businessId)
    .eq("channel", channel)
    .maybeSingle();

  await client.from("channel_analytics").upsert(
    {
      business_id: businessId,
      channel,
      total_messages: (row?.total_messages ?? 0) + (updates.totalMessages ?? 0),
      total_contacts: (row?.total_contacts ?? 0) + (updates.totalContacts ?? 0),
      ai_replies: (row?.ai_replies ?? 0) + (updates.aiReplies ?? 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,channel" },
  );
}
