import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformPreviewData = {
  tokenAdminEmail: string;
  business: {
    id: string;
    businessName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    ownerEmail: string | null;
    createdAt: string;
    stats: {
      conversations: number;
      messages30d: number;
      aiCostUsd30d: number;
      voiceCalls30d: number;
      connectedChannels: number;
    };
    channels: Array<{
      channel: string;
      label: string;
      status: string;
      connected: boolean;
    }>;
    controls: {
      accountStatus: string;
      aiEnabled: boolean;
      voiceEnabled: boolean;
      smsEnabled: boolean;
      automationsEnabled: boolean;
      outboundAiEnabled: boolean;
    } | null;
  };
  recentConversations: Array<{
    id: string;
    channel: string;
    status: string;
    updatedAt: string;
  }>;
};

export async function loadPlatformPreviewData(input: {
  businessId: string;
  adminEmail: string;
}): Promise<PlatformPreviewData | null> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("businesses")
    .select("*")
    .eq("id", input.businessId)
    .maybeSingle();

  if (!row) {
    return null;
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: ownerData },
    { data: controls },
    { count: conversationsCount },
    { data: aiUsage },
    { count: voiceCallsCount },
    { data: conversations },
  ] = await Promise.all([
    admin.auth.admin.getUserById(row.user_id as string),
    admin
      .from("platform_business_controls")
      .select("*")
      .eq("business_id", input.businessId)
      .maybeSingle(),
    admin
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("business_id", input.businessId),
    admin
      .from("ai_usage_logs")
      .select("estimated_cost_usd")
      .eq("business_id", input.businessId)
      .gte("created_at", since30d),
    admin
      .from("voice_call_logs")
      .select("*", { count: "exact", head: true })
      .eq("business_id", input.businessId)
      .gte("created_at", since30d),
    admin
      .from("conversations")
      .select("id, channel, status, updated_at")
      .eq("business_id", input.businessId)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const channelChecks = [
    {
      table: "whatsapp_connections",
      column: "whatsapp_status",
      channel: "whatsapp",
      label: "WhatsApp",
    },
    {
      table: "telegram_connections",
      column: "telegram_status",
      channel: "telegram",
      label: "Telegram",
    },
    {
      table: "email_connections",
      column: "email_status",
      channel: "email",
      label: "Email",
    },
    {
      table: "twilio_connections",
      column: "twilio_status",
      channel: "voice",
      label: "Twilio Voice",
    },
  ] as const;

  const channels = await Promise.all(
    channelChecks.map(async (entry) => {
      const { data } = await admin
        .from(entry.table)
        .select(entry.column)
        .eq("business_id", input.businessId)
        .maybeSingle();

      const status =
        (data as Record<string, string> | null)?.[entry.column] ?? "disconnected";

      return {
        channel: entry.channel,
        label: entry.label,
        status,
        connected: status === "connected" || status === "authorized",
      };
    }),
  );

  let messages30d = 0;
  const conversationIds = (conversations ?? []).map((item) => item.id as string);

  if (conversationIds.length > 0) {
    const { count } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .gte("sent_at", since30d);

    messages30d = count ?? 0;
  }

  const aiCostUsd30d = (aiUsage ?? []).reduce(
    (sum, entry) => sum + Number(entry.estimated_cost_usd ?? 0),
    0,
  );

  return {
    tokenAdminEmail: input.adminEmail,
    business: {
      id: row.id as string,
      businessName: row.business_name as string,
      email: (row.email as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      subscriptionPlan: row.subscription_plan as string,
      subscriptionStatus: row.subscription_status as string,
      ownerEmail: ownerData.user?.email ?? null,
      createdAt: row.created_at as string,
      stats: {
        conversations: conversationsCount ?? 0,
        messages30d,
        aiCostUsd30d,
        voiceCalls30d: voiceCallsCount ?? 0,
        connectedChannels: channels.filter((channel) => channel.connected).length,
      },
      channels,
      controls: controls
        ? {
            accountStatus: controls.account_status as string,
            aiEnabled: Boolean(controls.ai_enabled),
            voiceEnabled: Boolean(controls.voice_enabled),
            smsEnabled: Boolean(controls.sms_enabled),
            automationsEnabled: Boolean(controls.automations_enabled),
            outboundAiEnabled: Boolean(controls.outbound_ai_enabled),
          }
        : null,
    },
    recentConversations: (conversations ?? []).map((item) => ({
      id: item.id as string,
      channel: item.channel as string,
      status: item.status as string,
      updatedAt: item.updated_at as string,
    })),
  };
}
