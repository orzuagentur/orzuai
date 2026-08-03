import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { OUTLOOK_MESSAGES } from "@/features/email/outlook-constants";
import { hasMicrosoftOAuthEnv, hasSupabaseEnv } from "@/lib/env";
import {
  listRecentOutlookInboxMessages,
  sendOutlookMessage,
  syncOutlookInboxDelta,
  type ParsedOutlookMessage,
} from "@/lib/outlook/client";
import {
  buildOutlookAuthUrl,
  createOutlookOAuthState,
  exchangeOutlookCode,
  fetchOutlookAccountEmail,
  getOutlookRedirectUri,
  refreshOutlookAccessToken,
} from "@/lib/outlook/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import {
  deleteIntegrationSecret,
  resolveIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
import { scheduleInboundMessageProcessing } from "@/services/messaging.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import type { Database } from "@/types/database.types";
import type {
  OutlookConnectConfig,
  OutlookConnectionData,
} from "@/types/outlook-integration.types";

type OutlookConnection =
  Database["public"]["Tables"]["outlook_connections"]["Row"];

function mapOutlookConnection(row: OutlookConnection): OutlookConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.status,
    outlookAddress: row.outlook_address,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  };
}

export async function getOutlookConnection(
  businessId: string,
): Promise<OutlookConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("outlook_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapOutlookConnection(data) : null;
}

export async function isOutlookConnected(businessId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("outlook_connections")
    .select("status")
    .eq("business_id", businessId)
    .eq("status", "connected")
    .maybeSingle();

  return Boolean(data);
}

/** True when Gmail or Outlook mailbox is connected for the business. */
export async function isEmailMailboxConnected(
  businessId: string,
): Promise<boolean> {
  const { isGmailConnected } = await import(
    "@/services/gmail-integration.service"
  );
  if (await isGmailConnected(businessId)) {
    return true;
  }
  return isOutlookConnected(businessId);
}

export function getOutlookConnectConfig(): OutlookConnectConfig {
  return {
    isConfigured: hasMicrosoftOAuthEnv(),
    redirectUri: getOutlookRedirectUri(),
    connectUrl: "/api/integrations/outlook/connect",
    tenant: process.env.MICROSOFT_TENANT_ID?.trim() || "common",
  };
}

export async function buildOutlookOAuthUrlForBusiness(
  businessId: string,
): Promise<string> {
  if (!hasMicrosoftOAuthEnv()) {
    throw new Error(OUTLOOK_MESSAGES.notConfiguredTitle);
  }

  return buildOutlookAuthUrl(createOutlookOAuthState(businessId));
}

async function getValidAccessToken(
  connection: OutlookConnection,
): Promise<string | null> {
  const admin = createAdminClient();
  const accessToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "OUTLOOK_ACCESS_TOKEN",
    secretKeyName: connection.access_token_secret_key_name,
    legacyValue: null,
  });

  if (!accessToken) {
    return null;
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : null;
  const isExpired = expiresAt !== null && expiresAt <= Date.now() + 60_000;

  if (!isExpired) {
    return accessToken;
  }

  const refreshToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "OUTLOOK_REFRESH_TOKEN",
    secretKeyName: connection.refresh_token_secret_key_name,
    legacyValue: null,
  });

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshOutlookAccessToken(refreshToken);
  const nextRefresh = refreshed.refreshToken ?? refreshToken;
  const [accessKey, refreshKey] = await Promise.all([
    storeIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "OUTLOOK_ACCESS_TOKEN",
      value: refreshed.accessToken,
    }),
    storeIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "OUTLOOK_REFRESH_TOKEN",
      value: nextRefresh,
    }),
  ]);

  await admin
    .from("outlook_connections")
    .update({
      access_token_secret_key_name: accessKey,
      refresh_token_secret_key_name: refreshKey,
      token_expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.accessToken;
}

export async function getOutlookAccessTokenForBusiness(
  businessId: string,
): Promise<{ accessToken: string; fromEmail: string } | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("outlook_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "connected")
    .maybeSingle();

  if (!connection?.outlook_address) {
    return null;
  }

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) {
    return null;
  }

  return { accessToken, fromEmail: connection.outlook_address };
}

export async function completeOutlookOAuth(
  businessId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, error: "Database is not configured." };
  }

  try {
    const tokens = await exchangeOutlookCode(code);
    const email = await fetchOutlookAccountEmail(tokens.accessToken);

    if (!email) {
      return { success: false, error: "Could not read Outlook account email." };
    }

    if (!tokens.refreshToken) {
      return {
        success: false,
        error:
          "Microsoft did not return a refresh token. Remove the app consent and try again.",
      };
    }

    const admin = createAdminClient();
    const [accessKey, refreshKey] = await Promise.all([
      storeIntegrationSecret(admin, {
        businessId,
        kind: "OUTLOOK_ACCESS_TOKEN",
        value: tokens.accessToken,
      }),
      storeIntegrationSecret(admin, {
        businessId,
        kind: "OUTLOOK_REFRESH_TOKEN",
        value: tokens.refreshToken,
      }),
    ]);

    const now = new Date().toISOString();
    const { data: existing } = await admin
      .from("outlook_connections")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("outlook_connections")
        .update({
          status: "connected",
          outlook_address: email,
          access_token_secret_key_name: accessKey,
          refresh_token_secret_key_name: refreshKey,
          token_expires_at: tokens.expiresAt,
          delta_link: null,
          connected_at: now,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("outlook_connections").insert({
        business_id: businessId,
        status: "connected",
        outlook_address: email,
        access_token_secret_key_name: accessKey,
        refresh_token_secret_key_name: refreshKey,
        token_expires_at: tokens.expiresAt,
        connected_at: now,
      });
    }

    await syncOutlookInboxForBusiness(admin, businessId, { initial: true });

    revalidatePath(DASHBOARD_ROUTES.integrations);
    revalidatePath(DASHBOARD_ROUTES.chats);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Outlook connect failed.",
    };
  }
}

export async function disconnectOutlook(
  businessId: string,
): Promise<{ success: boolean }> {
  if (!hasSupabaseEnv()) {
    return { success: false };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("outlook_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!connection) {
    return { success: true };
  }

  await Promise.all([
    deleteIntegrationSecret(admin, connection.access_token_secret_key_name),
    deleteIntegrationSecret(admin, connection.refresh_token_secret_key_name),
  ]);

  await admin
    .from("outlook_connections")
    .update({
      status: "disconnected",
      access_token_secret_key_name: null,
      refresh_token_secret_key_name: null,
      token_expires_at: null,
      delta_link: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  revalidatePath(DASHBOARD_ROUTES.integrations);
  return { success: true };
}

async function ingestOutlookMessage(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  connection: OutlookConnection,
  message: ParsedOutlookMessage,
  options: { skipAutoReply?: boolean } = {},
): Promise<{ imported: boolean; conversationId?: string }> {
  if (
    connection.outlook_address &&
    message.fromEmail.toLowerCase() === connection.outlook_address.toLowerCase()
  ) {
    return { imported: false };
  }

  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel: "email",
    contactName: message.fromName || message.fromEmail,
    contactPhone: message.fromEmail,
    identifier: message.fromEmail,
    displayLabel: message.fromEmail,
  });

  if (!context) {
    return { imported: false };
  }

  await admin
    .from("contacts")
    .update({ email: message.fromEmail })
    .eq("id", context.contactId)
    .is("email", null);

  const inserted = await insertInboundChannelMessage(admin, {
    conversationId: context.conversationId,
    channel: "email",
    content: message.body,
    emailSubject: message.subject,
    externalMessageId: message.id,
    sentAt: message.sentAt ?? undefined,
  });

  if (!inserted || inserted.isDuplicate) {
    return { imported: false, conversationId: context.conversationId };
  }

  if (!message.isAutomated && !options.skipAutoReply) {
    await scheduleInboundMessageProcessing({
      admin,
      businessId,
      channel: "email",
      conversationId: context.conversationId,
      clientMessage: message.body,
    });
  }

  scheduleInboundMessagePush({
    businessId,
    contactId: context.contactId,
    contactName: message.fromName || message.fromEmail,
    conversationId: context.conversationId,
    channel: "email",
    preview: message.snippet,
    isNewContact: context.createdContact,
  });

  return { imported: true, conversationId: context.conversationId };
}

export async function syncOutlookInboxForBusiness(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  options: { initial?: boolean } = {},
): Promise<{ imported: number; scanned: number; error?: string }> {
  const { data: connection } = await admin
    .from("outlook_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("status", "connected")
    .maybeSingle();

  if (!connection) {
    return { imported: 0, scanned: 0, error: "Outlook is not connected." };
  }

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) {
    return {
      imported: 0,
      scanned: 0,
      error: "Outlook access expired. Reconnect Outlook in Integrations.",
    };
  }

  let messages: ParsedOutlookMessage[] = [];
  let nextDelta = connection.delta_link;
  let syncError: string | undefined;

  if (options.initial || !connection.delta_link) {
    const recent = await listRecentOutlookInboxMessages(accessToken, {
      top: 40,
    });
    messages = recent.messages;
    if (recent.error) {
      syncError = recent.error.message;
    }

    const deltaBootstrap = await syncOutlookInboxDelta(accessToken, null);
    nextDelta = deltaBootstrap.deltaLink;
    if (!syncError && deltaBootstrap.error) {
      syncError = deltaBootstrap.error.message;
    }
  } else {
    const delta = await syncOutlookInboxDelta(
      accessToken,
      connection.delta_link,
    );
    messages = delta.messages;
    nextDelta = delta.deltaLink;
    if (delta.error) {
      // Reset delta and fall back to recent list.
      const recent = await listRecentOutlookInboxMessages(accessToken, {
        top: 40,
      });
      messages = recent.messages;
      const bootstrap = await syncOutlookInboxDelta(accessToken, null);
      nextDelta = bootstrap.deltaLink;
      syncError = recent.error?.message ?? delta.error.message;
    }
  }

  let imported = 0;
  const importedConversationIds = new Set<string>();

  for (const message of messages) {
    const result = await ingestOutlookMessage(
      admin,
      businessId,
      connection,
      message,
      { skipAutoReply: options.initial },
    );
    if (result.imported) {
      imported += 1;
    }
    if (options.initial && result.conversationId) {
      importedConversationIds.add(result.conversationId);
    }
  }

  if (options.initial && importedConversationIds.size > 0) {
    await admin
      .from("conversations")
      .update({
        last_read_at: new Date().toISOString(),
        unread_count: 0,
      })
      .in("id", [...importedConversationIds]);
  }

  await admin
    .from("outlook_connections")
    .update({
      delta_link: nextDelta,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return {
    imported,
    scanned: messages.length,
    error: syncError,
  };
}

export async function syncAllOutlookInboxes(): Promise<{
  processed: number;
  imported: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, imported: 0 };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("outlook_connections")
    .select("business_id")
    .eq("status", "connected");

  let processed = 0;
  let imported = 0;

  for (const row of data ?? []) {
    const result = await syncOutlookInboxForBusiness(admin, row.business_id);
    processed += 1;
    imported += result.imported;
  }

  return { processed, imported };
}

export async function sendOutlookMailForBusiness(input: {
  businessId: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = await getOutlookAccessTokenForBusiness(input.businessId);
  if (!token) {
    return { success: false, error: "Outlook is not connected." };
  }

  return sendOutlookMessage({
    accessToken: token.accessToken,
    toEmail: input.toEmail,
    subject: input.subject,
    body: input.body,
  });
}
