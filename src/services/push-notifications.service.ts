import "server-only";

import webpush from "web-push";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isChatChannelId } from "@/features/chats/channel-config";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import {
  getAppUrl,
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  hasPushEnv,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_NOTIFICATION_SOUND,
  MANAGER_CALLOUT_SOUND,
} from "@/lib/push/notification-sounds";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";
import { getMessagePreviewText } from "@/utils/chat-media";
import type { MessagingChannel } from "@/types/database.types";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (!hasPushEnv()) {
    return false;
  }

  if (!vapidConfigured) {
    try {
      webpush.setVapidDetails(
        getVapidSubject(),
        getVapidPublicKey()!,
        getVapidPrivateKey()!,
      );
      vapidConfigured = true;
    } catch (error) {
      console.error(
        "[push] invalid VAPID configuration; push notifications disabled",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  return true;
}

export type InboundMessagePushInput = {
  businessId: string;
  contactId: string;
  contactName: string;
  conversationId: string;
  channel: MessagingChannel;
  preview?: string;
  isNewContact?: boolean;
};

type PushDeliveryResult = {
  sent: number;
  failed: number;
  skipped: boolean;
};

function getChannelLabel(channel: MessagingChannel): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel)?.label ??
    channel
  );
}

function buildConversationUrl(
  channel: MessagingChannel,
  conversationId: string,
): string {
  const appUrl = getAppUrl();
  const path = isChatChannelId(channel)
    ? `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`
    : `${DASHBOARD_ROUTES.chats}?conversation=${conversationId}`;

  return `${appUrl}${path}`;
}

async function deliverPushToBusiness(
  businessId: string,
  payload: string,
): Promise<PushDeliveryResult> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", businessId);

  if (!subscriptions?.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        return true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }

        return false;
      }
    }),
  );

  const sent = results.filter(
    (result) => result.status === "fulfilled" && result.value,
  ).length;
  const failed = results.length - sent;

  return { sent, failed, skipped: false };
}

export async function notifyInboundMessagePush(
  input: InboundMessagePushInput,
): Promise<PushDeliveryResult> {
  const channelLabel = getChannelLabel(input.channel);
  const contactName = input.contactName.trim() || "Customer";
  const preview = input.preview ? getMessagePreviewText(input.preview, 120) : "";
  const title = input.isNewContact
    ? `New lead — ${contactName}`
    : `New message — ${contactName}`;
  const body = preview
    ? `${channelLabel}: ${preview}`
    : input.isNewContact
      ? `New lead from ${channelLabel}`
      : `New message on ${channelLabel}`;

  const payload = JSON.stringify({
    title,
    body,
    url: buildConversationUrl(input.channel, input.conversationId),
    tag: `inbound-${input.conversationId}`,
    sound: LEAD_NOTIFICATION_SOUND,
  });

  try {
    return await deliverPushToBusiness(input.businessId, payload);
  } catch (error) {
    console.error("[push] failed to notify inbound message", error);
    return { sent: 0, failed: 0, skipped: true };
  }
}

export function scheduleInboundMessagePush(input: InboundMessagePushInput): void {
  void notifyInboundMessagePush(input).catch((error) => {
    console.error("[push] failed to schedule inbound message", error);
  });
}

/** @deprecated Use notifyInboundMessagePush */
export type NewLeadPushInput = Omit<
  InboundMessagePushInput,
  "conversationId"
> & {
  conversationId?: string;
};

/** @deprecated Use notifyInboundMessagePush */
export async function notifyNewLeadPush(
  input: NewLeadPushInput,
): Promise<PushDeliveryResult> {
  return notifyInboundMessagePush({
    businessId: input.businessId,
    contactId: input.contactId,
    contactName: input.contactName,
    conversationId: input.conversationId ?? input.contactId,
    channel: input.channel,
    preview: input.preview,
    isNewContact: true,
  });
}

/** @deprecated Use scheduleInboundMessagePush */
export function scheduleNewLeadPush(input: NewLeadPushInput): void {
  scheduleInboundMessagePush({
    businessId: input.businessId,
    contactId: input.contactId,
    contactName: input.contactName,
    conversationId: input.conversationId ?? input.contactId,
    channel: input.channel,
    preview: input.preview,
    isNewContact: true,
  });
}

export async function notifyPlatformAnnouncementPush(input: {
  businessId: string;
  announcementId: string;
  title: string;
  body: string;
  severity: string;
  url: string;
}): Promise<PushDeliveryResult> {
  const payload = JSON.stringify({
    title: input.title,
    body: input.body.slice(0, 180),
    url: input.url,
    tag: `announcement-${input.announcementId}`,
    sound: LEAD_NOTIFICATION_SOUND,
  });

  try {
    return await deliverPushToBusiness(input.businessId, payload);
  } catch (error) {
    console.error("[push] failed to notify platform announcement", error);
    return { sent: 0, failed: 0, skipped: true };
  }
}

export async function sendTestPushNotification(
  businessId: string,
): Promise<PushDeliveryResult> {
  const appUrl = getAppUrl();
  const payload = JSON.stringify({
    title: "OrzuX test notification",
    body: "Push notifications are working on this device.",
    url: `${appUrl}${DASHBOARD_ROUTES.chats}`,
    tag: "push-test",
    sound: LEAD_NOTIFICATION_SOUND,
  });

  try {
    return await deliverPushToBusiness(businessId, payload);
  } catch (error) {
    console.error("[push] failed to send test notification", error);
    return { sent: 0, failed: 0, skipped: true };
  }
}

export type AiHumanRequestPushInput = {
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactName: string;
  reason: string;
  requestId: string;
};

export async function notifyAiHumanRequestPush(
  input: AiHumanRequestPushInput,
): Promise<PushDeliveryResult> {
  const channelLabel = getChannelLabel(input.channel);
  const contactName = input.contactName.trim() || "Customer";
  const reason = input.reason.trim() || "Customer needs human help";
  const title = `AI needs you — ${contactName}`;
  const body = `${channelLabel}: ${reason}`;

  const payload = JSON.stringify({
    title,
    body,
    url: buildConversationUrl(input.channel, input.conversationId),
    tag: `human-request-${input.requestId}`,
    sound: MANAGER_CALLOUT_SOUND,
    alertKind: "human_request",
  });

  try {
    return await deliverPushToBusiness(input.businessId, payload);
  } catch (error) {
    console.error("[push] failed to notify ai human request", error);
    return { sent: 0, failed: 0, skipped: true };
  }
}

export function scheduleAiHumanRequestPush(input: AiHumanRequestPushInput): void {
  void notifyAiHumanRequestPush(input).catch((error) => {
    console.error("[push] failed to schedule ai human request", error);
  });
}

export type AgentActionPushInput = {
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactName: string;
  agentName: string;
  actionsSummary: string;
};

export async function notifyAgentActionPush(
  input: AgentActionPushInput,
): Promise<PushDeliveryResult> {
  const channelLabel = getChannelLabel(input.channel);
  const contactName = input.contactName.trim() || "Customer";
  const agentName = input.agentName.trim() || "AI Agent";
  const summary = input.actionsSummary.trim();
  const title = `${agentName} — ${contactName}`;
  const body = summary
    ? `${channelLabel}: ${summary}`
    : `${channelLabel}: CRM action completed`;

  const payload = JSON.stringify({
    title,
    body,
    url: buildConversationUrl(input.channel, input.conversationId),
    tag: `agent-action-${input.conversationId}-${Date.now()}`,
    sound: LEAD_NOTIFICATION_SOUND,
  });

  try {
    return await deliverPushToBusiness(input.businessId, payload);
  } catch (error) {
    console.error("[push] failed to notify agent action", error);
    schedulePlatformErrorReport({
      severity: "high",
      module: "platform",
      category: "push",
      source: "push-notifications",
      title: "Push notify agent action failed",
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      businessId: input.businessId,
      conversationId: input.conversationId,
      context: {
        channel: input.channel,
        agentName: input.agentName,
      },
      suggestedFix:
        "Verify VAPID_SUBJECT is mailto: or https:, and VAPID keys are valid.",
      rootCause:
        "Web push delivery failed while notifying operators about an AI action.",
    });
    return { sent: 0, failed: 0, skipped: true };
  }
}

export function scheduleAgentActionPush(input: AgentActionPushInput): void {
  void notifyAgentActionPush(input).catch((error) => {
    console.error("[push] failed to schedule agent action", error);
  });
}
