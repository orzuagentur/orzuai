import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import type {
  ActivityDataPoint,
  DashboardMetrics,
  DashboardOverview,
  RecentConversationItem,
} from "@/types/dashboard.types";
import {
  buildLastSevenDaysActivity,
  calculateConversionRate,
} from "@/utils/dashboard";

const EMPTY_METRICS: DashboardMetrics = {
  totalMessages: 0,
  uniqueContacts: 0,
  aiResponses: 0,
  conversionRate: 0,
};

function createEmptyOverview(): DashboardOverview {
  return {
    hasBusiness: false,
    metrics: EMPTY_METRICS,
    activity: buildLastSevenDaysActivity([]),
    recentConversations: [],
    whatsappStatus: null,
    whatsappPhoneNumber: null,
    aiEnabled: null,
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (!hasSupabaseEnv()) {
    return createEmptyOverview();
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return createEmptyOverview();
  }

  const supabase = await createClient();

  const [
    analyticsResult,
    whatsappResult,
    aiSettingsResult,
    conversationsResult,
    allConversationsResult,
  ] = await Promise.all([
    supabase
      .from("analytics")
      .select("total_messages, total_contacts, ai_replies")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("whatsapp_connections")
      .select("whatsapp_status, phone_number")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_settings")
      .select("ai_enabled")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("conversations")
      .select(
        "id, status, updated_at, contact:contacts(name, phone_number)",
      )
      .eq("business_id", business.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase.from("conversations").select("id").eq("business_id", business.id),
  ]);

  const totalMessages = analyticsResult.data?.total_messages ?? 0;
  const uniqueContacts = analyticsResult.data?.total_contacts ?? 0;
  const aiResponses = analyticsResult.data?.ai_replies ?? 0;

  const metrics: DashboardMetrics = {
    totalMessages,
    uniqueContacts,
    aiResponses,
    conversionRate: calculateConversionRate(aiResponses, totalMessages),
  };

  const conversationIds =
    allConversationsResult.data?.map((conversation) => conversation.id) ?? [];

  let activity: ActivityDataPoint[] = buildLastSevenDaysActivity([]);

  if (conversationIds.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: messages } = await supabase
      .from("messages")
      .select("created_at")
      .in("conversation_id", conversationIds)
      .gte("created_at", sevenDaysAgo.toISOString());

    activity = buildLastSevenDaysActivity(
      messages?.map((message) => message.created_at) ?? [],
    );
  }

  const recentConversations: RecentConversationItem[] =
    conversationsResult.data?.flatMap((conversation) => {
      const contact = Array.isArray(conversation.contact)
        ? conversation.contact[0]
        : conversation.contact;

      if (!contact) {
        return [];
      }

      return [
        {
          id: conversation.id,
          contactName: contact.name,
          contactPhone: contact.phone_number,
          status: conversation.status,
          updatedAt: conversation.updated_at,
        },
      ];
    }) ?? [];

  return {
    hasBusiness: true,
    metrics,
    activity,
    recentConversations,
    whatsappStatus: whatsappResult.data?.whatsapp_status ?? null,
    whatsappPhoneNumber: whatsappResult.data?.phone_number ?? null,
    aiEnabled: aiSettingsResult.data?.ai_enabled ?? null,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const overview = await getDashboardOverview();
  return overview.metrics;
}
