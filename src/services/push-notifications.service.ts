import "server-only";

import webpush from "web-push";

import { DASHBOARD_ROUTES } from "@/constants/routes";
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

export type NewLeadPushInput = {
  businessId: string;
  contactId: string;
  contactName: string;
  channel: MessagingChannel;
  preview?: string;
};

export async function notifyNewLeadPush(input: NewLeadPushInput): Promise<void> {
  if (!ensureVapidConfigured()) {
    return;
  }

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", input.businessId);

  if (!subscriptions?.length) {
    return;
  }

  const channelLabel =
    INTEGRATION_CHANNEL_LIST.find((channel) => channel.id === input.channel)
      ?.label ?? input.channel;
  const contactName = input.contactName.trim() || "New lead";
  const preview = input.preview ? getMessagePreviewText(input.preview, 120) : "";
  const appUrl = getAppUrl();
  const url = `${appUrl}${DASHBOARD_ROUTES.contacts}?contact=${input.contactId}`;
  const body = preview
    ? `${channelLabel}: ${preview}`
    : `New lead from ${channelLabel}`;

  const payload = JSON.stringify({
    title: `New lead — ${contactName}`,
    body,
    url,
    tag: `new-lead-${input.contactId}`,
    sound: "/sounds/new-lead.wav",
  });

  await Promise.allSettled(
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
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }),
  );
}

export function scheduleNewLeadPush(input: NewLeadPushInput): void {
  void notifyNewLeadPush(input).catch((error) => {
    console.error("[push] failed to notify new lead", error);
  });
}
