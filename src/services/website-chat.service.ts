import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
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
import type {
  EnableWebsiteChatResult,
  UpdateWebsiteChatSettingsInput,
  WebsiteChatConnectConfig,
  WebsiteChatConnectionData,
  WebsiteChatMessageInput,
} from "@/types/website-chat.types";
import {
  generateWebsiteChatWidgetToken,
  mapWebsiteChatConnection,
} from "@/utils/website-chat";

type WebsiteChatConnectionRow = {
  id: string;
  business_id: string;
  widget_token: string;
  connection_status: "connected" | "pending" | "disconnected";
  site_name: string | null;
  site_url: string | null;
  welcome_message: string;
  primary_color: string;
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

export async function enableWebsiteChat(): Promise<EnableWebsiteChatResult> {
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
  const existing = await getWebsiteChatConnection(businessId);

  if (existing?.status === "connected") {
    return { success: true, connection: existing };
  }

  const widgetToken = generateWebsiteChatWidgetToken();
  const { data, error } = await supabase
    .from("website_chat_connections")
    .upsert(
      {
        business_id: businessId,
        widget_token: widgetToken,
        connection_status: "connected",
        welcome_message: "Hi! How can we help you today?",
        primary_color: "#6366f1",
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
    connection: mapWebsiteChatConnection(
      data as WebsiteChatConnectionRow,
      config.widgetScriptBaseUrl,
    ),
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
      site_name: input.siteName?.trim() || null,
      site_url: input.siteUrl?.trim() || null,
      welcome_message: input.welcomeMessage.trim(),
      primary_color: input.primaryColor,
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

export async function processWebsiteChatMessage(
  widgetToken: string,
  input: WebsiteChatMessageInput,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Not configured" };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("website_chat_connections")
    .select("business_id, connection_status, welcome_message")
    .eq("widget_token", widgetToken)
    .maybeSingle();

  if (!connection || connection.connection_status !== "connected") {
    return { success: false, message: "Unauthorized" };
  }

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
    return { success: true };
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

  return { success: true };
}

export async function getWebsiteChatConfigByToken(widgetToken: string): Promise<{
  welcomeMessage: string;
  primaryColor: string;
} | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("website_chat_connections")
    .select("welcome_message, primary_color, connection_status")
    .eq("widget_token", widgetToken)
    .maybeSingle();

  if (!data || data.connection_status !== "connected") {
    return null;
  }

  return {
    welcomeMessage: data.welcome_message,
    primaryColor: data.primary_color,
  };
}
