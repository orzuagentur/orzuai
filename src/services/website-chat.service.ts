import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import {
  generateWebsiteFormApiKey,
  getWebsiteFormApiKeyPrefix,
  hashWebsiteFormApiKey,
  verifyWebsiteFormApiKey,
} from "@/lib/website-forms/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertCanConnectIntegration } from "@/services/entitlement.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { enableChannelAiIfAgentActive } from "@/services/channel-workspace.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import { scheduleInboundMessageEffects } from "@/services/inbound-message-effects.service";
import {
  findContactForChannel,
  resolveInboundConversation,
} from "@/services/messaging.service";
import { WEBSITE_CHAT_DEFAULT_APPEARANCE } from "@/features/website-chat/widget-appearance";
import { normalizePhoneNumber } from "@/utils/whatsapp";
import type {
  EnableWebsiteChatInput,
  EnableWebsiteChatResult,
  RegenerateWebsiteChatApiKeyResult,
  UpdateWebsiteChatSettingsInput,
  WebsiteChatConnectConfig,
  WebsiteChatConnectionData,
  WebsiteChatMessageInput,
  WebsiteChatWidgetMessage,
} from "@/types/website-chat.types";
import { extractRequestWebsiteOrigin } from "@/utils/website-origin";
import {
  generateWebsiteChatWidgetToken,
  mapWebsiteChatConnection,
} from "@/utils/website-chat";

type WebsiteChatConnectionRow = {
  id: string;
  business_id: string;
  widget_token: string;
  api_key_hash: string | null;
  api_key_prefix: string;
  connection_status: "connected" | "pending" | "disconnected";
  site_name: string | null;
  site_url: string | null;
  welcome_message: string;
  primary_color: string;
  widget_title: string;
  launcher_icon: string;
  position: string;
  connected_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

function getWidgetScriptBaseUrl(): string {
  return buildAppUrl("/widget/orzu-chat.js");
}

function revalidateWebsiteChatPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/website_chat`);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export function getWebsiteChatConnectConfig(): WebsiteChatConnectConfig {
  const widgetScriptBaseUrl = getWidgetScriptBaseUrl();

  return {
    isConfigured: widgetScriptBaseUrl.startsWith("https://"),
    widgetScriptBaseUrl,
  };
}

export async function getWebsiteChatConnection(
  businessId: string,
): Promise<WebsiteChatConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("website_chat_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapWebsiteChatConnection(
    data as WebsiteChatConnectionRow,
    getWidgetScriptBaseUrl(),
  );
}

export async function enableWebsiteChat(
  input?: EnableWebsiteChatInput,
): Promise<EnableWebsiteChatResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_CHAT_MESSAGES.notConfigured },
    };
  }

  const config = getWebsiteChatConnectConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_CHAT_MESSAGES.notConfigured },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WEBSITE_CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const entitlement = await assertCanConnectIntegration(businessId, "website_chat");

  if (!entitlement.allowed) {
    return {
      success: false,
      error: { code: "NOT_ALLOWED", message: entitlement.message },
    };
  }

  const supabase = await createClient();
  const { data: existingRow } = await supabase
    .from("website_chat_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (
    existingRow?.connection_status === "connected" &&
    existingRow.api_key_hash
  ) {
    return {
      success: true,
      connection: mapWebsiteChatConnection(
        existingRow as WebsiteChatConnectionRow,
        config.widgetScriptBaseUrl,
      ),
    };
  }

  const siteKey = generateWebsiteFormApiKey();
  const widgetToken =
    existingRow?.widget_token ?? generateWebsiteChatWidgetToken();
  const now = new Date().toISOString();

  const appearance = {
    widget_title:
      input?.widgetTitle.trim() ??
      existingRow?.widget_title ??
      WEBSITE_CHAT_DEFAULT_APPEARANCE.widgetTitle,
    welcome_message:
      input?.welcomeMessage.trim() ??
      existingRow?.welcome_message ??
      WEBSITE_CHAT_DEFAULT_APPEARANCE.welcomeMessage,
    primary_color:
      input?.primaryColor ??
      existingRow?.primary_color ??
      WEBSITE_CHAT_DEFAULT_APPEARANCE.primaryColor,
    launcher_icon:
      input?.launcherIcon ??
      existingRow?.launcher_icon ??
      WEBSITE_CHAT_DEFAULT_APPEARANCE.launcherIcon,
    position:
      input?.position ??
      existingRow?.position ??
      WEBSITE_CHAT_DEFAULT_APPEARANCE.position,
  };

  const { data, error } = await supabase
    .from("website_chat_connections")
    .upsert(
      {
        business_id: businessId,
        widget_token: widgetToken,
        api_key_hash: hashWebsiteFormApiKey(siteKey),
        api_key_prefix: getWebsiteFormApiKeyPrefix(siteKey),
        connection_status: "connected",
        connected_at: existingRow?.connected_at ?? now,
        ...appearance,
      },
      { onConflict: "business_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "DB_ERROR",
        message: error?.message ?? "Unable to enable Website Chat.",
      },
    };
  }

  await enableChannelAiIfAgentActive(businessId, "website_chat");
  revalidateWebsiteChatPaths();

  return {
    success: true,
    siteKey,
    connection: mapWebsiteChatConnection(
      data as WebsiteChatConnectionRow,
      config.widgetScriptBaseUrl,
      siteKey,
    ),
  };
}

export async function regenerateWebsiteChatApiKey(): Promise<RegenerateWebsiteChatApiKeyResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: WEBSITE_CHAT_MESSAGES.notConfigured },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WEBSITE_CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const siteKey = generateWebsiteFormApiKey();
  const supabase = await createClient();
  const { error } = await supabase
    .from("website_chat_connections")
    .update({
      api_key_hash: hashWebsiteFormApiKey(siteKey),
      api_key_prefix: getWebsiteFormApiKeyPrefix(siteKey),
    })
    .eq("business_id", businessId)
    .eq("connection_status", "connected");

  if (error) {
    return {
      success: false,
      error: { code: "DB_ERROR", message: error.message },
    };
  }

  revalidateWebsiteChatPaths();

  return {
    success: true,
    data: {
      siteKey,
      apiKeyPrefix: getWebsiteFormApiKeyPrefix(siteKey),
    },
  };
}

export async function updateWebsiteChatSettings(
  input: UpdateWebsiteChatSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: WEBSITE_CHAT_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_chat_connections")
    .update({
      widget_title: input.widgetTitle.trim(),
      welcome_message: input.welcomeMessage.trim(),
      primary_color: input.primaryColor,
      launcher_icon: input.launcherIcon,
      position: input.position,
      connection_status: "connected",
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateWebsiteChatPaths();
  return { success: true };
}

export async function disconnectWebsiteChat(): Promise<{
  success: boolean;
  message?: string;
}> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: WEBSITE_CHAT_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_chat_connections")
    .update({ connection_status: "disconnected" })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateWebsiteChatPaths();
  return { success: true };
}

async function verifyWebsiteChatWidgetAccess(
  widgetToken: string,
  apiKey: string | null,
): Promise<{
  id: string;
  business_id: string;
  connection_status: string;
  api_key_hash: string | null;
  site_url: string | null;
  connected_at: string | null;
} | null> {
  if (!hasSupabaseEnv() || !widgetToken) {
    return null;
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("website_chat_connections")
    .select("id, business_id, connection_status, api_key_hash, site_url, connected_at")
    .eq("widget_token", widgetToken)
    .maybeSingle();

  if (!connection || connection.connection_status !== "connected") {
    return null;
  }

  if (
    !apiKey ||
    !connection.api_key_hash ||
    !verifyWebsiteFormApiKey(apiKey, connection.api_key_hash)
  ) {
    return null;
  }

  return connection;
}

async function resolveWebsiteChatConversationId(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  visitorId: string,
): Promise<string | null> {
  const identifier = visitorId.trim();
  const contactPhone = `webchat:${identifier}`;

  const contact =
    (await findContactForChannel(admin, businessId, "website_chat", contactPhone)) ??
    (await findContactForChannel(admin, businessId, "website_chat", identifier));

  if (!contact?.id) {
    return null;
  }

  return resolveInboundConversation(admin, businessId, contact.id, "website_chat");
}

function mapWebsiteChatWidgetMessage(row: {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  sent_at: string | null;
}): WebsiteChatWidgetMessage {
  const senderType =
    row.sender_type === "client"
      ? "client"
      : row.sender_type === "ai"
        ? "ai"
        : "user";

  return {
    id: row.id,
    content: row.content,
    senderType,
    createdAt: row.sent_at ?? row.created_at,
  };
}

export async function listWebsiteChatMessages(
  widgetToken: string,
  apiKey: string | null,
  visitorId: string,
  after?: string,
): Promise<WebsiteChatWidgetMessage[] | null> {
  const connection = await verifyWebsiteChatWidgetAccess(widgetToken, apiKey);

  if (!connection) {
    return null;
  }

  const admin = createAdminClient();
  const conversationId = await resolveWebsiteChatConversationId(
    admin,
    connection.business_id,
    visitorId,
  );

  if (!conversationId) {
    return [];
  }

  let query = admin
    .from("messages")
    .select("id, content, sender_type, created_at, sent_at")
    .eq("conversation_id", conversationId)
    .eq("channel", "website_chat")
    .order("created_at", { ascending: true })
    .limit(200);

  if (after) {
    query = query.gt("created_at", after);
  }

  const { data } = await query;

  return (data ?? []).map(mapWebsiteChatWidgetMessage);
}

async function registerWebsiteChatSite(
  admin: ReturnType<typeof createAdminClient>,
  connectionId: string,
  request: Request,
  existingSiteUrl: string | null,
  existingConnectedAt: string | null,
): Promise<void> {
  const origin = extractRequestWebsiteOrigin(request);

  if (!origin) {
    return;
  }

  const now = new Date().toISOString();
  const hostname = (() => {
    try {
      return new URL(origin).hostname;
    } catch {
      return origin;
    }
  })();

  await admin
    .from("website_chat_connections")
    .update({
      site_url: existingSiteUrl ?? origin,
      site_name: hostname,
      connected_at: existingConnectedAt ?? now,
      last_seen_at: now,
    })
    .eq("id", connectionId);
}

export async function processWebsiteChatMessage(
  widgetToken: string,
  apiKey: string | null,
  request: Request,
  input: WebsiteChatMessageInput,
): Promise<{
  success: boolean;
  message?: string;
  data?: WebsiteChatWidgetMessage;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Not configured" };
  }

  const connection = await verifyWebsiteChatWidgetAccess(widgetToken, apiKey);

  if (!connection) {
    return { success: false, message: "Unauthorized" };
  }

  const admin = createAdminClient();

  await registerWebsiteChatSite(
    admin,
    connection.id,
    request,
    connection.site_url,
    connection.connected_at,
  );

  const visitorLabel = input.name?.trim() || "Website visitor";
  const identifier = input.visitorId.trim();
  const contactPhone = `webchat:${identifier}`;

  const context = await resolveInboundMessageContext(admin, {
    businessId: connection.business_id,
    channel: "website_chat",
    contactName: visitorLabel,
    contactPhone,
    identifier,
    displayLabel: visitorLabel,
  });

  if (!context) {
    return { success: false, message: "Unable to open conversation" };
  }

  const insertResult = await insertInboundChannelMessage(admin, {
    conversationId: context.conversationId,
    channel: "website_chat",
    content: input.message.trim(),
    externalMessageId: `webchat:${identifier}:${Date.now()}`,
  });

  if (insertResult?.isDuplicate) {
    return {
      success: true,
      data: mapWebsiteChatWidgetMessage(insertResult.message),
    };
  }

  if (!insertResult) {
    return { success: false, message: "Unable to save message" };
  }

  scheduleInboundMessageEffects({
    admin,
    businessId: connection.business_id,
    channel: "website_chat",
    conversationId: context.conversationId,
    clientMessage: input.message.trim(),
  });

  await maybeScheduleWebsiteChatOutboundCall({
    admin,
    businessId: connection.business_id,
    contactId: context.contactId,
    message: input.message.trim(),
    optionalPhone: input.phone,
  });

  return {
    success: true,
    data: mapWebsiteChatWidgetMessage(insertResult.message),
  };
}

function extractCallablePhoneFromText(text: string): string | null {
  const candidates = text.match(/(?:\+|00)?[\d][\d\s\-().]{7,20}\d/g) ?? [];

  for (const candidate of candidates) {
    const normalized = normalizePhoneNumber(candidate);
    const digits = normalized.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) {
      return normalized.startsWith("+") ? normalized : `+${digits}`;
    }
  }

  return null;
}

async function maybeScheduleWebsiteChatOutboundCall(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  contactId: string;
  message: string;
  optionalPhone?: string | null;
}): Promise<void> {
  const fromField = input.optionalPhone?.trim()
    ? normalizePhoneNumber(input.optionalPhone)
    : null;
  const fromMessage = extractCallablePhoneFromText(input.message);
  const rawPhone = fromField || fromMessage;

  if (!rawPhone) {
    return;
  }

  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return;
  }

  const phoneNumber = rawPhone.startsWith("+") ? rawPhone : `+${digits}`;

  if (
    phoneNumber.startsWith("webchat:") ||
    phoneNumber.startsWith("web:") ||
    phoneNumber === "website-form-lead"
  ) {
    return;
  }

  const { data: current } = await input.admin
    .from("contacts")
    .select("id, phone_number")
    .eq("id", input.contactId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (!current) {
    return;
  }

  const currentPhone = current.phone_number?.trim() ?? "";
  const isPlaceholder =
    !currentPhone ||
    currentPhone.startsWith("webchat:") ||
    currentPhone.startsWith("web:");

  // Only trigger outbound the first time we learn a real phone for this chat lead.
  if (!isPlaceholder) {
    return;
  }

  const { data: conflict } = await input.admin
    .from("contacts")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("phone_number", phoneNumber)
    .neq("id", input.contactId)
    .maybeSingle();

  if (!conflict) {
    await input.admin
      .from("contacts")
      .update({ phone_number: phoneNumber })
      .eq("id", input.contactId)
      .eq("business_id", input.businessId);
  }

  const { scheduleOutboundCallAfterOrder } = await import(
    "@/services/voice-agent.service"
  );
  await scheduleOutboundCallAfterOrder({
    businessId: input.businessId,
    contactId: input.contactId,
    phoneNumber,
  });
}

export async function getWebsiteChatConfigByToken(
  widgetToken: string,
  apiKey: string | null,
): Promise<{
  welcomeMessage: string;
  primaryColor: string;
  widgetTitle: string;
  launcherIcon: string;
  position: string;
} | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("website_chat_connections")
    .select(
      "welcome_message, primary_color, widget_title, launcher_icon, position, connection_status, api_key_hash",
    )
    .eq("widget_token", widgetToken)
    .maybeSingle();

  if (!data || data.connection_status !== "connected") {
    return null;
  }

  if (
    !apiKey ||
    !data.api_key_hash ||
    !verifyWebsiteFormApiKey(apiKey, data.api_key_hash)
  ) {
    return null;
  }

  return {
    welcomeMessage: data.welcome_message,
    primaryColor: data.primary_color,
    widgetTitle: data.widget_title ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.widgetTitle,
    launcherIcon: data.launcher_icon ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.launcherIcon,
    position: data.position ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.position,
  };
}
