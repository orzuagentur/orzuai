import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import {
  buildIntegrationChannelStatuses,
  isChannelConnectedForWorkspace,
} from "@/features/integrations/channel-status";
import { getWhatsAppConnection } from "@/services/whatsapp.service";
import { getTelegramConnection } from "@/services/telegram.service";
import { getWebsiteFormConnection } from "@/services/website-forms.service";
import { getGmailConnection } from "@/services/gmail-integration.service";
import { getGoogleCalendarConnection } from "@/services/google-calendar.service";
import { getBusinessBookingSetup } from "@/services/business-calendar-setup.service";
import { getWebsiteKnowledgeSync } from "@/services/website-knowledge.service";

export async function buildPlatformCopilotContextBlock(
  businessId: string,
): Promise<string> {
  const admin = createAdminClient();

  const [
    contactsResult,
    conversationsResult,
    dealsResult,
    calendarEventsResult,
    knowledgeResult,
    aiSettingsResult,
    whatsappConnection,
    telegramConnection,
    websiteFormConnection,
    gmailConnection,
    googleCalendarConnection,
    bookingSetup,
    websiteKnowledgeSync,
  ] = await Promise.all([
    admin
      .from("contacts")
      .select("id, name, phone_number, email, channel, last_message_at")
      .eq("business_id", businessId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(25),
    admin
      .from("conversations")
      .select(
        "id, channel, last_message_at, contact:contacts(id, name, phone_number)",
      )
      .eq("business_id", businessId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(20),
    admin
      .from("crm_deals")
      .select("id, contact_id, title, value, currency, stage, status, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("calendar_events")
      .select("id, title, start_at, end_at, timezone, google_event_id, is_booking")
      .eq("business_id", businessId)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(20),
    admin
      .from("knowledge_base")
      .select("id, title, category")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(30),
    admin
      .from("ai_settings")
      .select("channel, ai_enabled")
      .eq("business_id", businessId),
    getWhatsAppConnection(businessId),
    getTelegramConnection(businessId),
    getWebsiteFormConnection(businessId),
    getGmailConnection(businessId),
    getGoogleCalendarConnection(businessId),
    getBusinessBookingSetup(businessId),
    getWebsiteKnowledgeSync(businessId),
  ]);

  const channelStatuses = buildIntegrationChannelStatuses({
    whatsappConnection,
    telegramConnection,
    websiteFormConnection,
    websiteKnowledgeSync,
    gmailConnection,
  });

  const contacts = (contactsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone_number,
    email: row.email,
    channel: row.channel,
  }));

  const conversations = (conversationsResult.data ?? []).map((row) => {
    const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;

    return {
      conversationId: row.id,
      channel: row.channel,
      contactId: contact?.id ?? null,
      contactName: contact?.name ?? "Unknown",
      phone: contact?.phone_number ?? null,
    };
  });

  const knowledge = (knowledgeResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
  }));

  const deals = (dealsResult.data ?? []).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    value: row.value,
    currency: row.currency,
    stage: row.stage,
    status: row.status,
  }));

  const calendarEvents = (calendarEventsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    timeZone: row.timezone,
    syncedToGoogle: Boolean(row.google_event_id),
    isBooking: row.is_booking,
  }));

  const channelAi = MESSAGING_INTEGRATION_CHANNELS.map((channel) => {
    const connected = isChannelConnectedForWorkspace(channel, channelStatuses);
    const setting = (aiSettingsResult.data ?? []).find(
      (entry) => entry.channel === channel,
    );

    return {
      channel,
      connected,
      aiEnabled: setting?.ai_enabled ?? false,
    };
  });

  return JSON.stringify(
    {
      contacts,
      conversations,
      deals,
      calendar: {
        googleConnected: googleCalendarConnection?.status === "connected",
        accountEmail: googleCalendarConnection?.googleAccountEmail ?? null,
        timeZone: bookingSetup?.bookingTimezone ?? "UTC",
        upcomingEvents: calendarEvents,
      },
      knowledgeBaseEntries: knowledge,
      channels: channelAi,
      knowledgeEntryCount: knowledge.length,
    },
    null,
    2,
  );
}
