import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  EMAIL_INTEGRATION_HREF,
  EMAIL_MESSAGES,
} from "@/features/email/constants";
import {
  fetchGmailProfile,
  formatGmailApiError,
  getGmailMessage,
  listHistoryMessageIds,
  listRecentInboxMessageIds,
  stopGmailWatch,
  watchGmailInbox,
} from "@/lib/gmail/client";
import {
  getGmailPubsubTopic,
  getGmailPushWebhookUrl,
  hasGmailPushEnv,
  type GmailPushNotification,
} from "@/lib/gmail/push";
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
import {
  deleteIntegrationSecret,
  resolveIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
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
    watchExpiration: row.watch_expiration,
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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapGmailConnection(data) : null;
}

/** Authoritative server check — bypasses RLS for inbox send eligibility. */
export async function isGmailConnected(businessId: string): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("email_connections")
    .select("email_status")
    .eq("business_id", businessId)
    .eq("email_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export function getGmailConnectConfig(): GmailConnectConfig {
  return {
    isConfigured: hasGoogleOAuthEnv(),
    redirectUri: getGmailRedirectUri(),
    connectUrl: "/api/integrations/gmail/connect",
    pushEnabled: hasGmailPushEnv(),
    pushWebhookUrl: hasGmailPushEnv() ? getGmailPushWebhookUrl() : null,
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
  const admin = createAdminClient();
  const accessToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "GMAIL_ACCESS_TOKEN",
    secretKeyName: connection.access_token_secret_key_name,
    legacyValue: connection.access_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("email_connections")
        .update({
          access_token: null,
          access_token_secret_key_name: secretKeyName,
        })
        .eq("id", connection.id);
    },
  });

  if (!accessToken) {
    return null;
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : null;

  const isExpired =
    expiresAt !== null && expiresAt <= Date.now() + 60_000;

  if (!isExpired) {
    return accessToken;
  }

  const refreshToken = await resolveIntegrationSecret(admin, {
    businessId: connection.business_id,
    kind: "GMAIL_REFRESH_TOKEN",
    secretKeyName: connection.refresh_token_secret_key_name,
    legacyValue: connection.refresh_token,
    onMigrated: async (secretKeyName) => {
      await admin
        .from("email_connections")
        .update({
          refresh_token: null,
          refresh_token_secret_key_name: secretKeyName,
        })
        .eq("id", connection.id);
    },
  });

  if (!refreshToken) {
    return null;
  }

  const refreshed = await refreshGmailAccessToken(refreshToken);
  const nextRefreshToken = refreshed.refreshToken ?? refreshToken;
  const [accessSecretKeyName, refreshSecretKeyName] = await Promise.all([
    storeIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "GMAIL_ACCESS_TOKEN",
      value: refreshed.accessToken,
    }),
    storeIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "GMAIL_REFRESH_TOKEN",
      value: nextRefreshToken,
    }),
  ]);

  await admin
    .from("email_connections")
    .update({
      access_token: null,
      access_token_secret_key_name: accessSecretKeyName,
      refresh_token: null,
      refresh_token_secret_key_name: refreshSecretKeyName,
      token_expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.accessToken;
}

async function startGmailWatchForConnection(
  admin: ReturnType<typeof createAdminClient>,
  connection: EmailConnection,
): Promise<{ success: boolean; error?: string }> {
  const topicName = getGmailPubsubTopic();

  if (!topicName) {
    return { success: false, error: "Gmail Pub/Sub topic is not configured." };
  }

  const accessToken = await getValidAccessToken(connection);

  if (!accessToken) {
    return { success: false, error: "Gmail access token is missing or expired." };
  }

  const watch = await watchGmailInbox(accessToken, topicName);

  if ("error" in watch) {
    return { success: false, error: formatGmailApiError(watch.error) };
  }

  const expirationMs = Number(watch.expiration);
  const watchExpiration = Number.isFinite(expirationMs)
    ? new Date(expirationMs).toISOString()
    : null;

  await admin
    .from("email_connections")
    .update({
      history_id: watch.historyId,
      watch_expiration: watchExpiration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return { success: true };
}

async function stopGmailWatchForConnection(
  connection: EmailConnection,
): Promise<void> {
  const accessToken = await resolveIntegrationSecret(createAdminClient(), {
    businessId: connection.business_id,
    kind: "GMAIL_ACCESS_TOKEN",
    secretKeyName: connection.access_token_secret_key_name,
    legacyValue: connection.access_token,
  });

  if (!accessToken) {
    return;
  }

  try {
    const result = await stopGmailWatch(accessToken);

    if ("error" in result) {
      console.error("[gmail] stop watch on disconnect", result.error);
    }
  } catch (error) {
    console.error("[gmail] stop watch on disconnect failed", error);
  }
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

    const profileData =
      profile && "emailAddress" in profile ? profile : null;
    const gmailAddress = profileData?.emailAddress ?? email;
    const now = new Date().toISOString();
    const admin = createAdminClient();
    const [accessSecretKeyName, refreshSecretKeyName] = await Promise.all([
      storeIntegrationSecret(admin, {
        businessId,
        kind: "GMAIL_ACCESS_TOKEN",
        value: tokens.accessToken,
      }),
      storeIntegrationSecret(admin, {
        businessId,
        kind: "GMAIL_REFRESH_TOKEN",
        value: tokens.refreshToken,
      }),
    ]);

    const { error } = await admin.from("email_connections").upsert(
      {
        business_id: businessId,
        email_status: "connected",
        gmail_address: gmailAddress,
        access_token: null,
        access_token_secret_key_name: accessSecretKeyName,
        refresh_token: null,
        refresh_token_secret_key_name: refreshSecretKeyName,
        token_expires_at: tokens.expiresAt,
        history_id: profileData?.historyId ?? null,
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

    await syncGmailInboxForBusiness(admin, businessId, { initial: true });

    if (hasGmailPushEnv()) {
      const { data: connection } = await admin
        .from("email_connections")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (connection) {
        await startGmailWatchForConnection(admin, connection);
      }
    }

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

  try {
    const businessId = await getOwnedBusinessId();

    if (!businessId) {
      return { success: false, message: EMAIL_MESSAGES.noBusinessDescription };
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: connection } = await supabase
      .from("email_connections")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (connection?.email_status === "connected") {
      await stopGmailWatchForConnection(connection);
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await admin
      .from("email_connections")
      .update({
        email_status: "disconnected",
        gmail_address: null,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        history_id: null,
        watch_expiration: null,
        connected_at: null,
        last_synced_at: null,
        updated_at: now,
      })
      .eq("business_id", businessId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, message: error.message };
    }

    if (connection && !updated?.id) {
      return {
        success: false,
        message: "Could not disconnect Gmail. Please try again.",
      };
    }

    revalidateGmailPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : EMAIL_MESSAGES.oauthError;
    return { success: false, message };
  }
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
    emailSubject: parsed.subject,
    externalMessageId: parsed.id,
    sentAt: parsed.sentAt,
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
): Promise<{ imported: number; scanned: number; error?: string }> {
  const { data: connection } = await admin
    .from("email_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("email_status", "connected")
    .maybeSingle();

  if (!connection) {
    return { imported: 0, scanned: 0, error: "Gmail is not connected." };
  }

  const accessToken = await getValidAccessToken(connection);

  if (!accessToken) {
    return {
      imported: 0,
      scanned: 0,
      error: "Gmail access expired. Reconnect Gmail in Integrations.",
    };
  }

  const inbox = await listRecentInboxMessageIds(accessToken);
  const messageIdSet = new Set(inbox.messageIds);
  let nextHistoryId = connection.history_id;
  let syncError = inbox.error ? formatGmailApiError(inbox.error) : undefined;

  if (connection.history_id && !options.initial) {
    const history = await listHistoryMessageIds(
      accessToken,
      connection.history_id,
    );

    for (const messageId of history.messageIds) {
      messageIdSet.add(messageId);
    }

    if (history.historyId) {
      nextHistoryId = history.historyId;
    }

    if (!syncError && history.error && inbox.messageIds.length === 0) {
      syncError = formatGmailApiError(history.error);
    }
  }

  if (!nextHistoryId) {
    const profile = await fetchGmailProfile(accessToken);

    if (profile && "historyId" in profile) {
      nextHistoryId = profile.historyId;
    } else if (profile && "error" in profile && !syncError) {
      syncError = formatGmailApiError(profile.error);
    }
  }

  const messageIds = [...messageIdSet];
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

  return {
    imported,
    scanned: messageIds.length,
    error: syncError,
  };
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

export async function handleGmailPushNotification(
  notification: GmailPushNotification,
): Promise<{ synced: boolean; imported: number }> {
  if (!hasSupabaseEnv()) {
    return { synced: false, imported: 0 };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("email_connections")
    .select("*")
    .eq("email_status", "connected")
    .ilike("gmail_address", notification.emailAddress)
    .maybeSingle();

  if (!connection) {
    return { synced: false, imported: 0 };
  }

  const result = await syncGmailInboxForBusiness(
    admin,
    connection.business_id,
  );

  revalidateGmailPaths();
  return { synced: true, imported: result.imported };
}

export async function renewAllGmailWatches(): Promise<{
  processed: number;
  renewed: number;
  failed: number;
}> {
  if (!hasSupabaseEnv() || !hasGmailPushEnv()) {
    return { processed: 0, renewed: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const renewBeforeMs = Date.now() + 48 * 60 * 60 * 1000;

  const { data: connections } = await admin
    .from("email_connections")
    .select("*")
    .eq("email_status", "connected");

  const dueConnections = (connections ?? []).filter((connection) => {
    if (!connection.watch_expiration) {
      return true;
    }

    return new Date(connection.watch_expiration).getTime() <= renewBeforeMs;
  });

  let renewed = 0;
  let failed = 0;

  for (const connection of dueConnections) {
    const result = await startGmailWatchForConnection(admin, connection);

    if (result.success) {
      renewed += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: dueConnections.length,
    renewed,
    failed,
  };
}

export async function renewGmailWatchForBusiness(
  businessId: string,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv() || !hasGmailPushEnv()) {
    return {
      success: false,
      message: EMAIL_MESSAGES.pushNotConfigured,
    };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("email_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("email_status", "connected")
    .maybeSingle();

  if (!connection) {
    return { success: false, message: "Gmail is not connected." };
  }

  const result = await startGmailWatchForConnection(admin, connection);

  if (!result.success) {
    return { success: false, message: result.error ?? EMAIL_MESSAGES.pushFailed };
  }

  revalidateGmailPaths();
  return { success: true };
}
