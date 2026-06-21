import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { buildAppUrl } from "@/lib/app-url";
import { WEBSITE_FORMS_MESSAGES } from "@/features/website-forms/constants";
import { hasSupabaseEnv } from "@/lib/env";
import {
  formatWebsiteFormSubmissionBody,
  resolveWebsiteFormContactIdentifier,
} from "@/lib/website-forms/format-submission";
import { sendWebsiteFormTelegramFollowUp } from "@/lib/website-forms/telegram-follow-up";
import {
  generateWebsiteFormApiKey,
  generateWebhookToken,
  getWebsiteFormApiKeyPrefix,
  hashWebsiteFormApiKey,
  verifyWebsiteFormApiKey,
} from "@/lib/website-forms/auth";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { sendLeadFollowUpEmail } from "@/services/email.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import { generateFastAssistantReply } from "@/services/auto-reply-pipeline.service";
import { scheduleInboundMessageEffects } from "@/services/inbound-message-effects.service";
import {
  findContactForChannel,
  incrementMessagingAnalytics,
  insertChannelMessage,
  scheduleChannelAutoReply,
  resolveInboundConversation,
} from "@/services/messaging.service";
import type { WebsiteFormConnection } from "@/types/database.types";
import type {
  EnableWebsiteFormsResult,
  RegenerateWebsiteFormApiKeyResult,
  UpdateWebsiteFormsSettingsInput,
  WebsiteFormConnectConfig,
  WebsiteFormConnectionData,
  WebsiteFormFollowUpChannel,
  WebsiteFormSubmissionInput,
} from "@/types/website-forms.types";
import { parseWebsiteFormSubmissionPayload } from "@/types/website-forms.types";
import { mapWebsiteFormConnection } from "@/utils/website-forms";
import { normalizePhoneNumber } from "@/utils/whatsapp";

function getWebsiteFormWebhookBaseUrl(): string {
  return buildAppUrl("/api/webhooks/website-forms");
}

function buildWebhookUrl(token: string): string {
  return `${getWebsiteFormWebhookBaseUrl()}/${token}`;
}

function revalidateWebsiteFormsPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/website_forms`);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export function getWebsiteFormConnectConfig(): WebsiteFormConnectConfig {
  const webhookBaseUrl = getWebsiteFormWebhookBaseUrl();

  return {
    isConfigured: webhookBaseUrl.startsWith("https://"),
    webhookBaseUrl,
  };
}

export async function getWebsiteFormConnection(
  businessId: string,
): Promise<WebsiteFormConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("website_form_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapWebsiteFormConnection(data, buildWebhookUrl(data.webhook_token));
}

export async function enableWebsiteForms(): Promise<EnableWebsiteFormsResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_FORMS_MESSAGES.notConfigured },
    };
  }

  const webhookBaseUrl = getWebsiteFormWebhookBaseUrl();

  if (!webhookBaseUrl.startsWith("https://")) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_FORMS_MESSAGES.httpsRequired },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: WEBSITE_FORMS_MESSAGES.noBusinessDescription },
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("website_form_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing?.connection_status === "connected") {
    return {
      success: true,
      data: {
        ...mapWebsiteFormConnection(existing, buildWebhookUrl(existing.webhook_token)),
        apiKey: "",
      },
    };
  }

  const apiKey = generateWebsiteFormApiKey();
  const webhookToken = generateWebhookToken();
  const now = new Date().toISOString();

  const row = {
    business_id: businessId,
    webhook_token: webhookToken,
    api_key_hash: hashWebsiteFormApiKey(apiKey),
    api_key_prefix: getWebsiteFormApiKeyPrefix(apiKey),
    connection_status: "connected" as const,
    connected_at: now,
    auto_follow_up_enabled: true,
    follow_up_channel: "whatsapp" as const,
  };

  if (existing) {
    const { data: updated, error } = await supabase
      .from("website_form_connections")
      .update({
        ...row,
        api_key_hash: hashWebsiteFormApiKey(apiKey),
        api_key_prefix: getWebsiteFormApiKeyPrefix(apiKey),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) {
      return {
        success: false,
        error: { code: "DB_ERROR", message: WEBSITE_FORMS_MESSAGES.genericError },
      };
    }

    revalidateWebsiteFormsPaths();

    return {
      success: true,
      data: {
        ...mapWebsiteFormConnection(updated, buildWebhookUrl(updated.webhook_token)),
        apiKey,
      },
    };
  }

  const { data: created, error } = await supabase
    .from("website_form_connections")
    .insert(row)
    .select("*")
    .single();

  if (error || !created) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: WEBSITE_FORMS_MESSAGES.genericError },
    };
  }

  revalidateWebsiteFormsPaths();

  return {
    success: true,
    data: {
      ...mapWebsiteFormConnection(created, buildWebhookUrl(created.webhook_token)),
      apiKey,
    },
  };
}

export async function updateWebsiteFormsSettings(
  input: UpdateWebsiteFormsSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: WEBSITE_FORMS_MESSAGES.notConfigured };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: WEBSITE_FORMS_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const updates: {
    site_name?: string | null;
    site_url?: string | null;
    auto_follow_up_enabled?: boolean;
    follow_up_channel?: WebsiteFormFollowUpChannel;
  } = {};

  if (input.siteName !== undefined) {
    updates.site_name = input.siteName.trim() || null;
  }

  if (input.siteUrl !== undefined) {
    updates.site_url = input.siteUrl.trim() || null;
  }

  if (input.autoFollowUpEnabled !== undefined) {
    updates.auto_follow_up_enabled = input.autoFollowUpEnabled;
  }

  if (input.followUpChannel !== undefined) {
    updates.follow_up_channel = input.followUpChannel;
  }

  const { error } = await supabase
    .from("website_form_connections")
    .update(updates)
    .eq("business_id", businessId)
    .eq("connection_status", "connected");

  if (error) {
    return { success: false, message: WEBSITE_FORMS_MESSAGES.genericError };
  }

  revalidateWebsiteFormsPaths();
  return { success: true };
}

export async function regenerateWebsiteFormApiKey(): Promise<RegenerateWebsiteFormApiKeyResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_FORMS_MESSAGES.notConfigured },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: WEBSITE_FORMS_MESSAGES.noBusinessDescription },
    };
  }

  const apiKey = generateWebsiteFormApiKey();
  const supabase = await createClient();
  const { error } = await supabase
    .from("website_form_connections")
    .update({
      api_key_hash: hashWebsiteFormApiKey(apiKey),
      api_key_prefix: getWebsiteFormApiKeyPrefix(apiKey),
    })
    .eq("business_id", businessId)
    .eq("connection_status", "connected");

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: WEBSITE_FORMS_MESSAGES.genericError },
    };
  }

  revalidateWebsiteFormsPaths();

  return {
    success: true,
    data: {
      apiKey,
      apiKeyPrefix: getWebsiteFormApiKeyPrefix(apiKey),
    },
  };
}

export async function disconnectWebsiteForms(): Promise<{ success: boolean }> {
  if (!hasSupabaseEnv()) {
    return { success: false };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false };
  }

  const supabase = await createClient();
  await supabase
    .from("website_form_connections")
    .update({ connection_status: "disconnected" })
    .eq("business_id", businessId);

  revalidateWebsiteFormsPaths();
  return { success: true };
}

export async function verifyWebsiteFormWebhookAccess(
  webhookToken: string,
  apiKey: string | null,
): Promise<WebsiteFormConnection | null> {
  if (!hasSupabaseEnv() || !webhookToken) {
    return null;
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("website_form_connections")
    .select("*")
    .eq("webhook_token", webhookToken)
    .eq("connection_status", "connected")
    .maybeSingle();

  if (!connection) {
    return null;
  }

  if (apiKey && !verifyWebsiteFormApiKey(apiKey, connection.api_key_hash)) {
    return null;
  }

  return connection;
}

async function processWebsiteFormFollowUp(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  connection: WebsiteFormConnection;
  submission: WebsiteFormSubmissionInput;
  conversationId: string;
  clientMessage: string;
}): Promise<void> {
  const { admin, businessId, connection, submission, conversationId, clientMessage } =
    input;

  if (!connection.auto_follow_up_enabled || connection.follow_up_channel === "none") {
    scheduleChannelAutoReply({
      businessId,
      channel: "website_forms",
      conversationId,
      clientMessage,
    });
    return;
  }

  const { data: aiSettings } = await admin
    .from("ai_settings")
    .select("ai_enabled")
    .eq("business_id", businessId)
    .eq("channel", "website_forms")
    .maybeSingle();

  if (!aiSettings?.ai_enabled) {
    return;
  }

  const reply = await generateFastAssistantReply({
    admin,
    businessId,
    channel: "website_forms",
    conversationId,
    clientMessage,
  });

  if (!reply.success) {
    return;
  }

  const followUpText = reply.text;
  const channel = connection.follow_up_channel as WebsiteFormFollowUpChannel;
  let outboundSent = false;

  if (channel === "whatsapp" && submission.phone) {
    const { data: whatsappConnection } = await admin
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (
      whatsappConnection?.meta_phone_number_id &&
      whatsappConnection.meta_access_token
    ) {
      const to = normalizePhoneNumber(submission.phone);
      const sendResult = await sendWhatsAppTextMessage(
        whatsappConnection.meta_phone_number_id,
        whatsappConnection.meta_access_token,
        to,
        followUpText,
      );
      outboundSent = sendResult.success;
    }
  }

  if (channel === "email" && submission.email) {
    const { data: business } = await admin
      .from("businesses")
      .select("business_name")
      .eq("id", businessId)
      .maybeSingle();

    const emailResult = await sendLeadFollowUpEmail({
      to: submission.email,
      businessName: business?.business_name ?? "Our team",
      recipientName: submission.name?.trim() || "there",
      message: followUpText,
    });

    outboundSent = emailResult.success;
  }

  if (channel === "telegram") {
    outboundSent = await sendWebsiteFormTelegramFollowUp({
      admin,
      businessId,
      submission,
      message: followUpText,
    });
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "website_forms",
    senderType: "ai",
    content: outboundSent
      ? followUpText
      : `${followUpText}\n\n(Follow-up via ${channel} was not sent — check channel connection or lead contact details.)`,
    aiGenerated: true,
  });

  await incrementMessagingAnalytics(admin, businessId, "website_forms", {
    totalMessages: 1,
    aiReplies: 1,
  });
}

export async function ingestWebsiteFormSubmission(
  connection: WebsiteFormConnection,
  submission: WebsiteFormSubmissionInput,
): Promise<{ success: boolean }> {
  if (!hasSupabaseEnv()) {
    return { success: false };
  }

  const admin = createAdminClient();
  const businessId = connection.business_id;
  const body = formatWebsiteFormSubmissionBody(submission);
  const { phoneNumber, displayName } =
    resolveWebsiteFormContactIdentifier(submission);

  const existingContact = await findContactForChannel(
    admin,
    businessId,
    "website_forms",
    phoneNumber,
  );

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        channel: "website_forms",
        name: displayName,
        phone_number: phoneNumber,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    contactId = createdContactRow?.id;
    createdContact = Boolean(contactId);
  } else {
    await admin
      .from("contacts")
      .update({
        name: displayName,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }

  if (!contactId) {
    return { success: false };
  }

  const conversationId = await resolveInboundConversation(
    admin,
    businessId,
    contactId,
    "website_forms",
  );

  if (!conversationId) {
    return { success: false };
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "website_forms",
    senderType: "client",
    content: body,
  });

  const { processFormSubmitAutomations } = await import(
    "@/services/automation-engine.service"
  );
  await processFormSubmitAutomations({
    businessId,
    conversationId,
    contactId,
    contactName: displayName,
    message: body,
  });

  await incrementMessagingAnalytics(admin, businessId, "website_forms", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  scheduleInboundMessagePush({
    businessId,
    contactId,
    contactName: displayName,
    conversationId,
    channel: "website_forms",
    preview: body,
    isNewContact: createdContact,
  });

  scheduleInboundMessageEffects({
    admin,
    businessId,
    channel: "website_forms",
    conversationId,
    clientMessage: body,
  });

  await admin
    .from("website_form_connections")
    .update({ last_submission_at: new Date().toISOString() })
    .eq("id", connection.id);

  await processWebsiteFormFollowUp({
    admin,
    businessId,
    connection,
    submission,
    conversationId,
    clientMessage: body,
  });

  if (phoneNumber && phoneNumber !== "website-form-lead") {
    const { scheduleOutboundCallAfterOrder } = await import(
      "@/services/voice-agent.service"
    );
    await scheduleOutboundCallAfterOrder({
      admin,
      businessId,
      contactId,
      phoneNumber,
    });
  }

  revalidateWebsiteFormsPaths();
  return { success: true };
}

export async function processWebsiteFormWebhook(
  webhookToken: string,
  apiKey: string | null,
  body: unknown,
): Promise<{ success: boolean; message?: string }> {
  const connection = await verifyWebsiteFormWebhookAccess(webhookToken, apiKey);

  if (!connection) {
    return { success: false, message: "Unauthorized" };
  }

  const submission = parseWebsiteFormSubmissionPayload(body);

  if (!submission) {
    return { success: false, message: "Invalid payload" };
  }

  const result = await ingestWebsiteFormSubmission(connection, submission);
  return { success: result.success };
}
