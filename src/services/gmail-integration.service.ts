import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  EMAIL_INTEGRATION_HREF,
  EMAIL_MESSAGES,
} from "@/features/email/constants";
import {
  fetchGmailProfile,
  getGmailMessage,
  listHistoryMessageIds,
  listRecentInboxMessageIds,
} from "@/lib/gmail/client";
import {
  buildGmailAuthUrl,
  createGmailOAuthState,
  exchangeGmailCode,
  fetchGmailAccountEmail,
  getGmailRedirectUri,
  refreshGmailAccessToken,
} from "@/lib/gmail/oauth";
import { hasGoogleOAuthEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { enableAiForChannels } from "@/services/channel-workspace.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import {
  findMessageByExternalId,
  scheduleInboundMessageProcessing,
} from "@/services/messaging.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import type { EmailConnection } from "@/types/database.types";
import type {
  GmailConnectConfig,
  GmailConnectionData,
} from "@/types/gmail-integration.types";

function revalidateGmailPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(EMAIL_INTEGRATION_HREF);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function mapGmailConnection(row: EmailConnection): GmailConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.email_status,
    gmailAddress: row.gmail_address,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  };
}

export async function getGmailConnection(
  businessId: string,
): Promise<GmailConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("email_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapGmailConnection(data) : null;
}

export function getGmailConnectConfig(): GmailConnectConfig {
  return {
    isConfigured: hasGoogleOAuthEnv(),
    redirectUri: getGmailRedirectUri(),
    connectUrl: "/api/integrations/gmail/connect",
  };
}

export async function buildGmailOAuthUrlForBusiness(
  businessId: string,
): Promise<string> {
  if (!hasGoogleOAuthEnv()) {
    throw new Error(EMAIL_MESSAGES.notConfiguredTitle);
  }

  const state = createGmailOAuthState(businessId);
  return buildGmailAuthUrl(state);
}

async function getValidAccessToken(
  connection: EmailConnection,
): Promise<string | null> {
  if (!connection.access_token) {
    return null;
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : null;

  const isExpired =
    expiresAt !== null && expiresAt <= Date.now() + 60_000;

  if (!isExpired) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    return null;
  }

  const refreshed = await refreshGmailAccessToken(connection.refresh_token);
  const admin = createAdminClient();

  await admin
    .from("email_connections")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken ?? connection.refresh_token,
      token_expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.accessToken;
}

export async function completeGmailOAuth(
  businessId: string,
  code: string,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv() || !hasGoogleOAuthEnv()) {
    return { success: false, message: EMAIL_MESSAGES.oauthError };
  }

  try {
    const tokens = await exchangeGmailCode(code);
    const [profile, email] = await Promise.all([
      fetchGmailProfile(tokens.accessToken),
      fetchGmailAccountEmail(tokens.accessToken),
    ]);

    const gmailAddress = profile?.emailAddress ?? email;
    const now = new Date().toISOString();
    const supabase = await createClient();

    const { error } = await supabase.from("email_connections").upsert(
      {
        business_id: businessId,
        email_status: "connected",
        gmail_address: gmailAddress,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        history_id: profile?.historyId ?? null,
        connected_at: now,
        last_synced_at: null,
        updated_at: now,
      },
      { onConflict: "business_id" },
    );

    if (error) {
      return { success: false, message: error.message };
    }

    await enableAiForChannels(businessId, ["email"]);

    const admin = createAdminClient();
    await syncGmailInboxForBusiness(admin, businessId, { initial: true });

    revalidateGmailPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : EMAIL_MESSAGES.oauthError;
    return { success: false, message };
  }
}

export async function disconnectGmail(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: EMAIL_MESSAGES.oauthError };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: EMAIL_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("email_connections")
    .update({
      email_status: "disconnected",
      gmail_address: null,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      history_id: null,
      connected_at: null,
      last_synced_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateGmailPaths();
  return { success: true };
}

async function ingestGmailMessage(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  connection: EmailConnection,
  messageId: string,
): Promise<boolean> {
  const accessToken = await getValidAccessToken(connection);

  if (!accessToken) {
    return false;
  }

  const existing = await findMessageByExternalId(admin, "email", messageId);

  if (existing) {
    return false;
  }

  const parsed = await getGmailMessage(accessToken, messageId);

  if (!parsed?.fromEmail) {
    return false;
  }

  if (
    connection.gmail_address &&
    parsed.fromEmail.toLowerCase() === connection.gmail_address.toLowerCase()
  ) {
    return false;
  }

  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel: "email",
    contactName: parsed.fromName || parsed.fromEmail,
    contactPhone: parsed.fromEmail,
    identifier: parsed.fromEmail,
    displayLabel: parsed.fromEmail,
  });

  if (!context) {
    return false;
  }

  await admin
    .from("contacts")
    .update({ email: parsed.fromEmail })
    .eq("id", context.contactId)
    .is("email", null);

  const inserted = await insertInboundChannelMessage(admin, {
    conversationId: context.conversationId,
    channel: "email",
    content: parsed.body,
    externalMessageId: parsed.id,
  });

  if (!inserted || inserted.isDuplicate) {
    return false;
  }

  await scheduleInboundMessageProcessing({
    admin,
    businessId,
    channel: "email",
    conversationId: context.conversationId,
    clientMessage: parsed.body,
  });

  scheduleInboundMessagePush({
    businessId,
    contactId: context.contactId,
    contactName: parsed.fromName || parsed.fromEmail,
    conversationId: context.conversationId,
    channel: "email",
    preview: parsed.snippet,
    isNewContact: context.createdContact,
  });

  return true;
}

export async function syncGmailInboxForBusiness(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  options: { initial?: boolean } = {},
): Promise<{ imported: number }> {
  const { data: connection } = await admin
    .from("email_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("email_status", "connected")
    .maybeSingle();

  if (!connection) {
    return { imported: 0 };
  }

  const accessToken = await getValidAccessToken(connection);

  if (!accessToken) {
    return { imported: 0 };
  }

  let messageIds: string[] = [];
  let nextHistoryId = connection.history_id;

  if (connection.history_id && !options.initial) {
    const history = await listHistoryMessageIds(
      accessToken,
      connection.history_id,
    );
    messageIds = history.messageIds;
    nextHistoryId = history.historyId ?? connection.history_id;
  } else {
    messageIds = await listRecentInboxMessageIds(accessToken);
    const profile = await fetchGmailProfile(accessToken);
    nextHistoryId = profile?.historyId ?? connection.history_id;
  }

  let imported = 0;

  for (const messageId of messageIds) {
    const didImport = await ingestGmailMessage(
      admin,
      businessId,
      connection,
      messageId,
    );

    if (didImport) {
      imported += 1;
    }
  }

  await admin
    .from("email_connections")
    .update({
      history_id: nextHistoryId,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return { imported };
}

export async function syncAllGmailInboxes(): Promise<{
  processed: number;
  imported: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0, imported: 0 };
  }

  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("email_connections")
    .select("business_id")
    .eq("email_status", "connected");

  let imported = 0;

  for (const row of connections ?? []) {
    const result = await syncGmailInboxForBusiness(admin, row.business_id);
    imported += result.imported;
  }

  return { processed: connections?.length ?? 0, imported };
}

export async function getGmailAccessTokenForBusiness(
  businessId: string,
): Promise<{ accessToken: string; fromEmail: string } | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("email_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("email_status", "connected")
    .maybeSingle();

  if (!connection?.gmail_address) {
    return null;
  }

  const accessToken = await getValidAccessToken(connection);

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    fromEmail: connection.gmail_address,
  };
}
