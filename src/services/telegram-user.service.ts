import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import {
  fetchRecentIncoming,
  getTelegramApiCredentials,
  isTelegramMtprotoConfigured,
  requestLoginCode,
  sendTextMessage,
  submitLoginCode,
  submitPassword,
  type TelegramIncomingMessage,
  type TelegramSelf,
} from "@/lib/telegram/mtproto";
import {
  deleteIntegrationSecret,
  readIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import {
  incrementMessagingAnalytics,
  scheduleInboundMessageProcessing,
} from "@/services/messaging.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import { getMessagePlainText } from "@/utils/chat-media";

type AdminClient = ReturnType<typeof createAdminClient>;

export type TelegramUserStatus =
  | "disconnected"
  | "pending_code"
  | "pending_password"
  | "connected";

export type TelegramUserConnection = {
  id: string;
  businessId: string;
  status: TelegramUserStatus;
  phoneNumber: string | null;
  telegramUserId: string | null;
  username: string | null;
  firstName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
};

export type TelegramUserActionResult =
  | { success: true; status: TelegramUserStatus }
  | { success: false; message: string };

const NOT_CONFIGURED =
  "Telegram personal account is not configured. Set TELEGRAM_API_ID and TELEGRAM_API_HASH.";
const NO_BUSINESS = "No business found for the current user.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

type ConnectionRow = {
  id: string;
  business_id: string;
  status: TelegramUserStatus;
  phone_number: string | null;
  phone_code_hash: string | null;
  telegram_user_id: string | null;
  username: string | null;
  first_name: string | null;
  session_secret_key_name: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
};

function mapConnection(row: ConnectionRow): TelegramUserConnection {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.status,
    phoneNumber: row.phone_number,
    telegramUserId: row.telegram_user_id,
    username: row.username,
    firstName: row.first_name,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
  };
}

async function getRowByBusiness(
  admin: AdminClient,
  businessId: string,
): Promise<ConnectionRow | null> {
  const { data } = await admin
    .from("telegram_user_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

/** Public read for UI. RLS-scoped. */
export async function getTelegramUserConnection(
  businessId: string,
): Promise<TelegramUserConnection | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_user_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapConnection(data as ConnectionRow) : null;
}

async function loadSession(
  admin: AdminClient,
  row: ConnectionRow,
): Promise<string | null> {
  return readIntegrationSecret(admin, row.session_secret_key_name);
}

async function persistSession(
  admin: AdminClient,
  businessId: string,
  session: string,
): Promise<string | null> {
  return storeIntegrationSecret(admin, {
    businessId,
    kind: "TELEGRAM_USER_SESSION",
    value: session,
    description: `Encrypted Telegram MTProto StringSession for business ${businessId}`,
  });
}

async function upsertConnection(
  admin: AdminClient,
  businessId: string,
  patch: Partial<Omit<ConnectionRow, "id" | "business_id">>,
): Promise<void> {
  const existing = await getRowByBusiness(admin, businessId);
  const payload = { ...patch, updated_at: new Date().toISOString() };

  if (existing) {
    await admin
      .from("telegram_user_connections")
      .update(payload)
      .eq("id", existing.id);
    return;
  }

  await admin
    .from("telegram_user_connections")
    .insert({ business_id: businessId, ...payload });
}

/** Step 1: request the login code for a phone number. */
export async function startTelegramUserLogin(
  phoneNumber: string,
): Promise<TelegramUserActionResult> {
  if (!hasSupabaseEnv() || !isTelegramMtprotoConfigured()) {
    return { success: false, message: NOT_CONFIGURED };
  }

  const creds = getTelegramApiCredentials();
  if (!creds) {
    return { success: false, message: NOT_CONFIGURED };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const phone = phoneNumber.trim();
  if (!phone) {
    return { success: false, message: "Phone number is required." };
  }

  try {
    const { session, phoneCodeHash } = await requestLoginCode(creds, phone);
    const admin = createAdminClient();
    const secretKeyName = await persistSession(admin, businessId, session);

    await upsertConnection(admin, businessId, {
      status: "pending_code",
      phone_number: phone,
      phone_code_hash: phoneCodeHash,
      session_secret_key_name: secretKeyName,
      telegram_user_id: null,
      username: null,
      first_name: null,
      connected_at: null,
    });

    return { success: true, status: "pending_code" };
  } catch (error) {
    return { success: false, message: describeError(error) };
  }
}

/** Step 2: submit the login code. May require a 2FA password afterwards. */
export async function confirmTelegramUserCode(
  code: string,
): Promise<TelegramUserActionResult> {
  const creds = getTelegramApiCredentials();
  if (!hasSupabaseEnv() || !creds) {
    return { success: false, message: NOT_CONFIGURED };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);
  if (!row || !row.phone_number || !row.phone_code_hash) {
    return { success: false, message: "Start the login flow first." };
  }

  const session = await loadSession(admin, row);
  if (!session) {
    return { success: false, message: "Login session expired. Start again." };
  }

  try {
    const result = await submitLoginCode(creds, {
      session,
      phoneNumber: row.phone_number,
      phoneCodeHash: row.phone_code_hash,
      code: code.trim(),
    });

    if (result.status === "password_required") {
      await persistSession(admin, businessId, result.session);
      await upsertConnection(admin, businessId, { status: "pending_password" });
      return { success: true, status: "pending_password" };
    }

    await finalizeConnection(admin, businessId, result.session, result.user);
    return { success: true, status: "connected" };
  } catch (error) {
    return { success: false, message: describeError(error) };
  }
}

/** Step 3 (2FA only): submit the account password. */
export async function confirmTelegramUserPassword(
  password: string,
): Promise<TelegramUserActionResult> {
  const creds = getTelegramApiCredentials();
  if (!hasSupabaseEnv() || !creds) {
    return { success: false, message: NOT_CONFIGURED };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);
  if (!row) {
    return { success: false, message: "Start the login flow first." };
  }

  const session = await loadSession(admin, row);
  if (!session) {
    return { success: false, message: "Login session expired. Start again." };
  }

  try {
    const result = await submitPassword(creds, {
      session,
      password: password.trim(),
    });
    await finalizeConnection(admin, businessId, result.session, result.user);
    return { success: true, status: "connected" };
  } catch (error) {
    return { success: false, message: describeError(error) };
  }
}

async function finalizeConnection(
  admin: AdminClient,
  businessId: string,
  session: string,
  user: TelegramSelf,
): Promise<void> {
  await persistSession(admin, businessId, session);
  const now = new Date().toISOString();
  await upsertConnection(admin, businessId, {
    status: "connected",
    phone_code_hash: null,
    telegram_user_id: user.id,
    username: user.username,
    first_name: user.firstName,
    phone_number: user.phone ?? undefined,
    connected_at: now,
    last_synced_at: now,
  });
}

export async function disconnectTelegramUser(): Promise<TelegramUserActionResult> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: GENERIC_ERROR };
  }

  const businessId = await getOwnedBusinessId();
  if (!businessId) {
    return { success: false, message: NO_BUSINESS };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);

  if (row?.session_secret_key_name) {
    await deleteIntegrationSecret(admin, row.session_secret_key_name);
  }

  await upsertConnection(admin, businessId, {
    status: "disconnected",
    phone_number: null,
    phone_code_hash: null,
    telegram_user_id: null,
    username: null,
    first_name: null,
    session_secret_key_name: null,
    connected_at: null,
    last_synced_at: null,
  });

  return { success: true, status: "disconnected" };
}

/** Sends a message from the connected personal account to `peer`. */
export async function sendTelegramUserMessage(input: {
  businessId: string;
  peer: string;
  message: string;
}): Promise<{ success: boolean; messageId?: number | null; message?: string }> {
  const creds = getTelegramApiCredentials();
  if (!creds) {
    return { success: false, message: NOT_CONFIGURED };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, input.businessId);
  if (!row || row.status !== "connected") {
    return { success: false, message: "Telegram account is not connected." };
  }

  const session = await loadSession(admin, row);
  if (!session) {
    return { success: false, message: "Telegram session is missing." };
  }

  try {
    const { messageId } = await sendTextMessage(creds, {
      session,
      peer: input.peer,
      message: input.message,
    });
    return { success: true, messageId };
  } catch (error) {
    return { success: false, message: describeError(error) };
  }
}

/** Pulls recent inbound messages for the connected account (worker/cron path). */
export async function fetchTelegramUserIncoming(
  businessId: string,
): Promise<TelegramIncomingMessage[]> {
  const creds = getTelegramApiCredentials();
  if (!creds) {
    return [];
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);
  if (!row || row.status !== "connected") {
    return [];
  }

  const session = await loadSession(admin, row);
  if (!session) {
    return [];
  }

  const messages = await fetchRecentIncoming(creds, { session });

  await admin
    .from("telegram_user_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", row.id);

  return messages;
}

export type TelegramUserInboundMessage = {
  chatId: string;
  externalMessageId: string;
  senderName?: string | null;
  text: string;
  sentAt?: string | null;
};

/**
 * Persists inbound messages received by the personal Telegram account (from the
 * worker) into the inbox. Reuses the shared `telegram` channel pipeline so
 * contacts, dedup, push, analytics and AI auto-reply all behave identically to
 * the bot integration. Identifier space is `tg:<chatId>`.
 */
export async function ingestTelegramUserMessages(
  businessId: string,
  messages: TelegramUserInboundMessage[],
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv() || messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  const row = await getRowByBusiness(admin, businessId);

  if (!row || row.status !== "connected") {
    return { processed: 0 };
  }

  let processed = 0;

  for (const message of messages) {
    const content = message.text.trim();
    if (!content) {
      continue;
    }

    const identifier = `tg:${message.chatId}`;
    const contactName = message.senderName?.trim() || "Telegram contact";

    const context = await resolveInboundMessageContext(admin, {
      businessId,
      channel: "telegram",
      contactName,
      contactPhone: identifier,
      identifier,
      displayLabel: contactName,
    });

    if (!context) {
      continue;
    }

    const { contactId, conversationId, createdContact } = context;

    const insertResult = await insertInboundChannelMessage(admin, {
      conversationId,
      channel: "telegram",
      content,
      externalMessageId: message.externalMessageId,
      sentAt: message.sentAt ?? undefined,
    });

    if (!insertResult || insertResult.isDuplicate) {
      continue;
    }

    scheduleInboundMessagePush({
      businessId,
      contactId,
      contactName,
      conversationId,
      channel: "telegram",
      preview: getMessagePlainText(content),
      isNewContact: createdContact,
    });

    await incrementMessagingAnalytics(admin, businessId, "telegram", {
      totalMessages: 1,
      totalContacts: createdContact ? 1 : 0,
    });

    await scheduleInboundMessageProcessing({
      admin,
      businessId,
      channel: "telegram",
      conversationId,
      clientMessage: getMessagePlainText(content),
    });

    processed += 1;
  }

  await admin
    .from("telegram_user_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", row.id);

  return { processed };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("PHONE_CODE_INVALID")) return "The code is invalid.";
    if (msg.includes("PHONE_CODE_EXPIRED")) return "The code has expired. Start again.";
    if (msg.includes("PASSWORD_HASH_INVALID")) return "The 2FA password is incorrect.";
    if (msg.includes("PHONE_NUMBER_INVALID")) return "The phone number is invalid.";
    if (msg.includes("PHONE_NUMBER_BANNED")) return "This phone number is banned by Telegram.";
    if (msg.includes("FLOOD_WAIT")) return "Too many attempts. Please wait and try again.";
    return msg;
  }
  return GENERIC_ERROR;
}
