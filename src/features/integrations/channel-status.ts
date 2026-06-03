import type { InstagramConnectionData } from "@/types/instagram.types";
import type { TelegramConnectionData } from "@/types/telegram.types";
import type { WebsiteFormConnectionData } from "@/types/website-forms.types";
import type { WhatsAppConnectionData } from "@/types/whatsapp.types";

import type { IntegrationChannelId } from "./constants";

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
  instagramConnection: InstagramConnectionData | null;
  telegramConnection: TelegramConnectionData | null;
  websiteFormConnection: WebsiteFormConnectionData | null;
};

export function buildIntegrationChannelStatuses({
  whatsappConnection,
  instagramConnection,
  telegramConnection,
  websiteFormConnection,
}: BuildChannelStatusesInput): IntegrationChannelStatusMap {
  let whatsappStatus: IntegrationChannelStatus = "disconnected";
  let whatsappDetail: string | undefined;

  if (whatsappConnection?.status === "connected") {
    whatsappStatus = "connected";
    whatsappDetail = whatsappConnection.phoneNumber;
  } else if (whatsappConnection?.status === "pending") {
    whatsappStatus = "pending";
  }

  let instagramStatus: IntegrationChannelStatus = "disconnected";
  let instagramDetail: string | undefined;

  if (instagramConnection?.status === "connected") {
    instagramStatus = "connected";
    instagramDetail = instagramConnection.username
      ? `@${instagramConnection.username}`
      : undefined;
  } else if (instagramConnection?.status === "pending") {
    instagramStatus = "pending";
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

  return {
    whatsapp: {
      status: whatsappStatus,
      detail: whatsappDetail,
    },
    instagram: {
      status: instagramStatus,
      detail: instagramDetail,
    },
    telegram: {
      status: telegramStatus,
      detail: telegramDetail,
    },
    website_forms: {
      status: websiteFormsStatus,
      detail: websiteFormsDetail,
    },
  };
}

export function isChannelConnectedForWorkspace(
  channel: IntegrationChannelId,
  statuses: IntegrationChannelStatusMap,
): boolean {
  return statuses[channel]?.status === "connected";
}
