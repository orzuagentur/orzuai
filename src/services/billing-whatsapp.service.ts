import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { buildDailyUsageSeries, getOwnedBusinessBillingContext } from "@/services/billing-twilio.service";
import { getWhatsAppConnection } from "@/services/whatsapp.service";
import type { WhatsAppBillingData } from "@/types/billing.types";

const WHATSAPP_ESTIMATED_COST_PER_CONVERSATION_CENTS = 8;

export async function getWhatsAppBillingPageData(): Promise<WhatsAppBillingData> {
  const empty: WhatsAppBillingData = {
    isConnected: false,
    phoneNumber: null,
    displayName: null,
    connectedAt: null,
    totalMessages: 0,
    totalContacts: 0,
    aiReplies: 0,
    messagesLast30Days: [],
    estimatedMonthlySpendCents: null,
  };

  const ctx = await getOwnedBusinessBillingContext();

  if (!ctx || !hasSupabaseEnv()) {
    return empty;
  }

  const businessId = ctx.business.id;
  const supabase = await createClient();

  const [connection, analyticsResult, messagesSeries] = await Promise.all([
    getWhatsAppConnection(businessId),
    supabase
      .from("channel_analytics")
      .select("total_messages, total_contacts, ai_replies")
      .eq("business_id", businessId)
      .eq("channel", "whatsapp")
      .maybeSingle(),
    buildDailyUsageSeries({
      businessId,
      table: "messages",
      days: 30,
      channel: "whatsapp",
    }),
  ]);

  const analytics = analyticsResult.data;
  const totalMessages = analytics?.total_messages ?? 0;
  const estimatedMonthlySpendCents =
    totalMessages > 0
      ? Math.max(
          WHATSAPP_ESTIMATED_COST_PER_CONVERSATION_CENTS,
          Math.round(totalMessages * 0.35),
        )
      : null;

  return {
    isConnected: connection?.status === "connected",
    phoneNumber: connection?.phoneNumber ?? null,
    displayName: connection?.phoneNumber ?? null,
    connectedAt: connection?.connectedAt ?? null,
    totalMessages,
    totalContacts: analytics?.total_contacts ?? 0,
    aiReplies: analytics?.ai_replies ?? 0,
    messagesLast30Days: messagesSeries.map((point) => ({
      date: point.label,
      label: point.label,
      value: point.value,
    })),
    estimatedMonthlySpendCents,
  };
}
