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
import type { MessagingChannel } from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (!hasPushEnv()) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      getVapidSubject(),
      getVapidPublicKey()!,
      getVapidPrivateKey()!,
    );
    vapidConfigured = true;
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
    sound: "/sounds/new-lead.wav",
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

export async function sendTestPushNotification(
  businessId: string,
): Promise<PushDeliveryResult> {
  const appUrl = getAppUrl();
  const payload = JSON.stringify({
    title: "OrzuX test notification",
    body: "Push notifications are working on this device.",
    url: `${appUrl}${DASHBOARD_ROUTES.chats}`,
    tag: "push-test",
    sound: "/sounds/new-lead.wav",
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
    sound: "/sounds/new-lead.wav",
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
