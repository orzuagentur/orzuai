import "server-only";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  isMessagingIntegrationChannel,
} from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { isChannelConnectedForWorkspace } from "@/features/integrations/channel-status";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getChannelAnalytics,
  getChannelConnectionStatuses,
} from "@/services/channel-workspace.service";
import type {
  AnalyticsPageData,
  AnalyticsTotals,
  MessagingChannel,
} from "@/types/channel-workspace.types";
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

const MESSAGING_CHANNELS = MESSAGING_INTEGRATION_CHANNELS;

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
    channelAnalyticsResult,
    whatsappResult,
    aiSettingsResult,
    conversationsResult,
    allConversationsResult,
  ] = await Promise.all([
    supabase
      .from("channel_analytics")
      .select("total_messages, total_contacts, ai_replies")
      .eq("business_id", business.id),
    supabase
      .from("whatsapp_connections")
      .select("whatsapp_status, phone_number")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_settings")
      .select("ai_enabled, channel")
      .eq("business_id", business.id),
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

  const channelRows = channelAnalyticsResult.data ?? [];
  const totalMessages = channelRows.reduce(
    (sum, row) => sum + (row.total_messages ?? 0),
    0,
  );
  const uniqueContacts = channelRows.reduce(
    (sum, row) => sum + (row.total_contacts ?? 0),
    0,
  );
  const aiResponses = channelRows.reduce(
    (sum, row) => sum + (row.ai_replies ?? 0),
    0,
  );

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
    aiEnabled:
      aiSettingsResult.data && aiSettingsResult.data.length > 0
        ? aiSettingsResult.data.some((row) => row.ai_enabled)
        : null,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const overview = await getDashboardOverview();
  return overview.metrics;
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function buildTotals(
  channels: AnalyticsPageData["channels"],
): AnalyticsTotals {
  return channels.reduce<AnalyticsTotals>(
    (acc, entry) => ({
      totalMessages: acc.totalMessages + entry.analytics.totalMessages,
      totalContacts: acc.totalContacts + entry.analytics.totalContacts,
      aiReplies: acc.aiReplies + entry.analytics.aiReplies,
      activeConversations:
        acc.activeConversations + entry.analytics.activeConversations,
    }),
    {
      totalMessages: 0,
      totalContacts: 0,
      aiReplies: 0,
      activeConversations: 0,
    },
  );
}

export async function getAnalyticsPageData(
  activeChannelParam?: string | null,
): Promise<AnalyticsPageData> {
  const channelParam = activeChannelParam as IntegrationChannelId | undefined;
  const activeChannel: MessagingChannel =
    channelParam && isMessagingIntegrationChannel(channelParam)
      ? channelParam
      : "whatsapp";

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      activeChannel,
      channelStatuses: {},
      channels: [],
      totals: {
        totalMessages: 0,
        totalContacts: 0,
        aiReplies: 0,
        activeConversations: 0,
      },
    };
  }

  const channelStatuses = await getChannelConnectionStatuses(businessId);

  const channels = await Promise.all(
    MESSAGING_CHANNELS.map(async (channel) => {
      const isChannelConnected = isChannelConnectedForWorkspace(
        channel,
        channelStatuses,
      );
      const analytics = await getChannelAnalytics(channel);

      return {
        channel,
        analytics,
        isChannelConnected,
      };
    }),
  );

  return {
    hasBusiness: true,
    activeChannel,
    channelStatuses,
    channels,
    totals: buildTotals(channels),
  };
}
