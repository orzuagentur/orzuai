import type { VoiceConnectionData } from "@/types/voice-agent.types";
import type { GmailConnectionData } from "@/types/gmail-integration.types";
import type { GoogleCalendarConnectionData } from "@/types/google-calendar.types";
import type { TelegramConnectionData } from "@/types/telegram.types";
import type { WebsiteFormConnectionData } from "@/types/website-forms.types";
import type { WebsiteChatConnectionData } from "@/types/website-chat.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";
import type { WhatsAppConnectionData } from "@/types/whatsapp.types";

import {
  MESSAGING_INTEGRATION_CHANNELS,
  type IntegrationChannelId,
  type MessagingIntegrationChannelId,
} from "./constants";

export type IntegrationChannelStatus =
  | "connected"
  | "pending"
  | "disconnected"
  | "coming_soon";

export type IntegrationChannelStatusEntry = {
  status: IntegrationChannelStatus;
  detail?: string;
};

export type IntegrationChannelStatusMap = Partial<
  Record<IntegrationChannelId, IntegrationChannelStatusEntry>
>;

type BuildChannelStatusesInput = {
  whatsappConnection: WhatsAppConnectionData | null;
  telegramConnection: TelegramConnectionData | null;
  websiteFormConnection: WebsiteFormConnectionData | null;
  websiteChatConnection?: WebsiteChatConnectionData | null;
  websiteKnowledgeSync: WebsiteKnowledgeSyncData | null;
  voiceConnection?: VoiceConnectionData | null;
  voiceSmsEnabled?: boolean;
  googleCalendarConnection?: GoogleCalendarConnectionData | null;
  gmailConnection?: GmailConnectionData | null;
};

export function buildIntegrationChannelStatuses({
  whatsappConnection,
  telegramConnection,
  websiteFormConnection,
  websiteChatConnection,
  websiteKnowledgeSync,
  voiceConnection,
  voiceSmsEnabled = false,
  googleCalendarConnection,
  gmailConnection,
}: BuildChannelStatusesInput): IntegrationChannelStatusMap {
  let whatsappStatus: IntegrationChannelStatus = "disconnected";
  let whatsappDetail: string | undefined;

  if (whatsappConnection?.status === "connected") {
    whatsappStatus = "connected";
    whatsappDetail = whatsappConnection.phoneNumber;
  } else if (whatsappConnection?.status === "pending") {
    whatsappStatus = "pending";
  }

  let telegramStatus: IntegrationChannelStatus = "disconnected";
  let telegramDetail: string | undefined;

  if (telegramConnection?.status === "connected") {
    telegramStatus = "connected";
    telegramDetail = telegramConnection.botUsername
      ? `@${telegramConnection.botUsername}`
      : undefined;
  } else if (telegramConnection?.status === "pending") {
    telegramStatus = "pending";
  }

  let websiteFormsStatus: IntegrationChannelStatus = "disconnected";
  let websiteFormsDetail: string | undefined;

  if (websiteFormConnection?.status === "connected") {
    websiteFormsStatus = "connected";
    websiteFormsDetail =
      websiteFormConnection.siteName ?? websiteFormConnection.siteUrl ?? undefined;
  } else if (websiteFormConnection?.status === "pending") {
    websiteFormsStatus = "pending";
  }

  let websiteKnowledgeStatus: IntegrationChannelStatus = "disconnected";
  let websiteKnowledgeDetail: string | undefined;

  if (websiteKnowledgeSync?.syncStatus === "ready") {
    websiteKnowledgeStatus = "connected";
    websiteKnowledgeDetail = websiteKnowledgeSync.siteUrl.replace(/^https?:\/\//, "");
  } else if (websiteKnowledgeSync?.syncStatus === "syncing") {
    websiteKnowledgeStatus = "pending";
    websiteKnowledgeDetail = "Syncing…";
  } else if (websiteKnowledgeSync?.syncStatus === "error") {
    websiteKnowledgeStatus = "pending";
    websiteKnowledgeDetail = "Sync error";
  } else if (websiteKnowledgeSync) {
    websiteKnowledgeStatus = "pending";
  }

  let voiceStatus: IntegrationChannelStatus = "disconnected";
  let voiceDetail: string | undefined;

  if (voiceConnection?.status === "connected") {
    voiceStatus = "connected";
    voiceDetail = voiceConnection.phoneNumber ?? undefined;
  } else if (voiceConnection?.status === "pending") {
    voiceStatus = "pending";
    voiceDetail = voiceConnection.phoneNumber ?? undefined;
  }

  let googleCalendarStatus: IntegrationChannelStatus = "disconnected";
  let googleCalendarDetail: string | undefined;

  if (googleCalendarConnection?.status === "connected") {
    googleCalendarStatus = "connected";
    googleCalendarDetail =
      googleCalendarConnection.googleAccountEmail ??
      googleCalendarConnection.calendarSummary ??
      undefined;
  } else if (googleCalendarConnection?.status === "pending") {
    googleCalendarStatus = "pending";
  }

  let emailStatus: IntegrationChannelStatus = "disconnected";
  let emailDetail: string | undefined;

  if (gmailConnection?.status === "connected") {
    emailStatus = "connected";
    emailDetail = gmailConnection.gmailAddress ?? undefined;
  } else if (gmailConnection?.status === "pending") {
    emailStatus = "pending";
  }

  let websiteChatStatus: IntegrationChannelStatus = "disconnected";
  let websiteChatDetail: string | undefined;

  if (websiteChatConnection?.status === "connected") {
    websiteChatStatus = "connected";
    websiteChatDetail =
      websiteChatConnection.siteName ?? websiteChatConnection.siteUrl ?? undefined;
  } else if (websiteChatConnection?.status === "pending") {
    websiteChatStatus = "pending";
  }

  let smsStatus: IntegrationChannelStatus = "disconnected";
  let smsDetail: string | undefined;

  if (voiceConnection?.status === "connected" && voiceSmsEnabled) {
    smsStatus = "connected";
    smsDetail = voiceConnection.phoneNumber ?? undefined;
  } else if (voiceConnection?.status === "connected") {
    smsStatus = "pending";
    smsDetail = "Twilio connected — enable SMS";
  } else if (voiceConnection?.status === "pending") {
    smsStatus = "pending";
  }

  return {
    whatsapp: {
      status: whatsappStatus,
      detail: whatsappDetail,
    },
    telegram: {
      status: telegramStatus,
      detail: telegramDetail,
    },
    website_forms: {
      status: websiteFormsStatus,
      detail: websiteFormsDetail,
    },
    website_knowledge: {
      status: websiteKnowledgeStatus,
      detail: websiteKnowledgeDetail,
    },
    voice: {
      status: voiceStatus,
      detail: voiceDetail,
    },
    google_calendar: {
      status: googleCalendarStatus,
      detail: googleCalendarDetail,
    },
    email: {
      status: emailStatus,
      detail: emailDetail,
    },
    website_chat: {
      status: websiteChatStatus,
      detail: websiteChatDetail,
    },
    sms: {
      status: smsStatus,
      detail: smsDetail,
    },
    facebook_messenger: {
      status: "coming_soon",
    },
  };
}

export function isChannelConnectedForWorkspace(
  channel: IntegrationChannelId,
  statuses: IntegrationChannelStatusMap,
): boolean {
  return statuses[channel]?.status === "connected";
}

export function isActiveMessagingChannel(
  channel: MessagingIntegrationChannelId,
  statuses: IntegrationChannelStatusMap,
): boolean {
  const status = statuses[channel]?.status ?? "disconnected";
  return status === "connected" || status === "pending";
}

export function getActiveMessagingChannelIds(
  statuses: IntegrationChannelStatusMap,
): MessagingIntegrationChannelId[] {
  return MESSAGING_INTEGRATION_CHANNELS.filter((channel) =>
    isActiveMessagingChannel(channel, statuses),
  );
}
