import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { TWILIO_MESSAGES } from "@/features/twilio/constants";
import { buildAppUrl } from "@/lib/app-url";
import {
  buildTwilioConnectAuthorizeUrl,
  createTwilioConnectState,
  getTwilioPlatformAuthToken,
  hasTwilioConnectEnv,
  hasTwilioPlatformEnv,
} from "@/lib/twilio/connect";
import {
  clearTwilioPhoneNumberWebhooks,
  configureTwilioPhoneNumberWebhooks,
  fetchTwilioAccount,
  listTwilioIncomingPhoneNumbers,
  type TwilioApiCredentials,
} from "@/lib/twilio/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { TwilioConnection } from "@/types/database.types";
import type {
  TwilioConnectConfig,
  TwilioConnectionData,
  TwilioPhoneNumberOption,
} from "@/types/twilio-integration.types";

type AdminClient = ReturnType<typeof createAdminClient>;

function revalidateTwilioPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/voice`);
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

function mapTwilioConnection(row: TwilioConnection): TwilioConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.twilio_status,
    connectedAccountSid: row.connected_account_sid,
    accountFriendlyName: row.account_friendly_name,
    phoneNumber: row.phone_number,
    phoneSid: row.phone_sid,
    connectedAt: row.connected_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  };
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export function getTwilioConnectConfig(): TwilioConnectConfig {
  return {
    isConfigured: hasTwilioConnectEnv(),
    connectUrl: "/api/integrations/twilio/connect",
    authorizeRedirectUri: buildAppUrl("/api/integrations/twilio/callback"),
  };
}

export async function buildTwilioConnectUrlForBusiness(
  businessId: string,
): Promise<string> {
  if (!hasTwilioConnectEnv()) {
    throw new Error(TWILIO_MESSAGES.notConfiguredTitle);
  }

  const state = createTwilioConnectState(businessId);
  return buildTwilioConnectAuthorizeUrl(state);
}

export async function getTwilioConnection(
  businessId: string,
): Promise<TwilioConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("twilio_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapTwilioConnection(data) : null;
}

export function resolveTwilioCredentialsForBusiness(
  connection: TwilioConnectionData | null,
): TwilioApiCredentials | null {
  const authToken = getTwilioPlatformAuthToken();

  if (!authToken) {
    return null;
  }

  if (connection?.connectedAccountSid) {
    return {
      accountSid: connection.connectedAccountSid,
      authToken,
    };
  }

  return null;
}

export async function listTwilioPhoneNumbersForBusiness(
  businessId: string,
): Promise<TwilioPhoneNumberOption[]> {
  const connection = await getTwilioConnection(businessId);

  if (!connection || connection.status === "disconnected") {
    return [];
  }

  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials) {
    return [];
  }

  try {
    return await listTwilioIncomingPhoneNumbers(credentials);
  } catch (error) {
    console.warn(
      "[twilio] list phone numbers failed",
      JSON.stringify({
        businessId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return [];
  }
}

function buildVoiceWebhookUrls(businessId: string) {
  return {
    inboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
    outboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
  };
}

async function upsertTwilioConnectionRow(
  admin: AdminClient,
  businessId: string,
  patch: Partial<TwilioConnection>,
): Promise<TwilioConnectionData | null> {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("twilio_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("twilio_connections")
      .update({
        ...patch,
        updated_at: now,
      })
      .eq("business_id", businessId)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data ? mapTwilioConnection(data) : null;
  }

  const { data, error } = await admin
    .from("twilio_connections")
    .insert({
      business_id: businessId,
      twilio_status: "disconnected",
      ...patch,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapTwilioConnection(data) : null;
}

export async function completeTwilioConnectAuthorization(input: {
  businessId: string;
  connectedAccountSid: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv() || !hasTwilioPlatformEnv()) {
    return { success: false, message: TWILIO_MESSAGES.notConfiguredTitle };
  }

  const accountSid = input.connectedAccountSid.trim();

  if (!accountSid.startsWith("AC")) {
    return { success: false, message: TWILIO_MESSAGES.invalidAccountSid };
  }

  const admin = createAdminClient();
  const credentials: TwilioApiCredentials = {
    accountSid,
    authToken: getTwilioPlatformAuthToken()!,
  };

  let friendlyName: string | null = null;

  try {
    const account = await fetchTwilioAccount(credentials);
    friendlyName = account.friendly_name ?? null;
  } catch (error) {
    console.warn(
      "[twilio] account lookup failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return { success: false, message: TWILIO_MESSAGES.accountVerifyFailed };
  }

  await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "authorized",
    connected_account_sid: accountSid,
    account_friendly_name: friendlyName,
    phone_number: null,
    phone_sid: null,
    connected_at: null,
    last_synced_at: new Date().toISOString(),
  });

  revalidateTwilioPaths();
  return { success: true };
}

export async function selectTwilioPhoneNumber(input: {
  businessId: string;
  phoneSid: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const connection = await getTwilioConnection(input.businessId);

  if (!connection || connection.status === "disconnected") {
    return { success: false, message: TWILIO_MESSAGES.notAuthorized };
  }

  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials) {
    return { success: false, message: TWILIO_MESSAGES.notConfiguredTitle };
  }

  const numbers = await listTwilioIncomingPhoneNumbers(credentials);
  const selected = numbers.find((entry) => entry.sid === input.phoneSid);

  if (!selected) {
    return { success: false, message: TWILIO_MESSAGES.phoneNotFound };
  }

  const webhooks = buildVoiceWebhookUrls(input.businessId);
  const now = new Date().toISOString();

  try {
    await configureTwilioPhoneNumberWebhooks({
      credentials,
      phoneSid: selected.sid,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.inboundWebhookUrl,
      statusCallbackUrl: webhooks.inboundWebhookUrl,
    });
  } catch (error) {
    console.error(
      "[twilio] webhook setup failed",
      JSON.stringify({
        businessId: input.businessId,
        phoneSid: selected.sid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return { success: false, message: TWILIO_MESSAGES.webhookSetupFailed };
  }

  const admin = createAdminClient();

  await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "connected",
    phone_number: selected.phoneNumber,
    phone_sid: selected.sid,
    connected_at: connection.connectedAt ?? now,
    last_synced_at: now,
  });

  const voiceSettingsResult = await import("@/services/voice-agent.service").then(
    (module) =>
      module.saveVoiceAgentSettings(input.businessId, {
    enabled: true,
    provider: "twilio",
    phoneNumber: selected.phoneNumber,
    outboundEnabled: true,
    inboundEnabled: true,
    callbackAfterOrder: true,
    callbackDelayMinutes: 5,
    outboundScript:
      "Hello! This is your AI assistant calling to confirm your order and see if you have any questions.",
    inboundGreeting: "Thank you for calling. How can we help you today?",
    retellAgentId: "",
    vapiAssistantId: "",
    twilioPhoneSid: selected.sid,
    aiEnabled: true,
    voiceLanguage: "English",
    voiceSystemPrompt: "",
      }),
  );

  if (!voiceSettingsResult.success) {
    return voiceSettingsResult;
  }

  revalidateTwilioPaths();
  return { success: true };
}

export async function resyncTwilioConnection(
  businessId: string,
): Promise<{ success: boolean; message?: string }> {
  const connection = await getTwilioConnection(businessId);

  if (!connection?.phoneSid || connection.status !== "connected") {
    return { success: false, message: TWILIO_MESSAGES.notConnected };
  }

  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials) {
    return { success: false, message: TWILIO_MESSAGES.notConfiguredTitle };
  }

  const webhooks = buildVoiceWebhookUrls(businessId);

  try {
    await configureTwilioPhoneNumberWebhooks({
      credentials,
      phoneSid: connection.phoneSid,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.inboundWebhookUrl,
      statusCallbackUrl: webhooks.inboundWebhookUrl,
    });
  } catch {
    return { success: false, message: TWILIO_MESSAGES.resyncFailed };
  }

  const admin = createAdminClient();
  await upsertTwilioConnectionRow(admin, businessId, {
    last_synced_at: new Date().toISOString(),
  });

  revalidateTwilioPaths();
  return { success: true };
}

export async function disconnectTwilioIntegration(
  businessId: string,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const connection = await getTwilioConnection(businessId);
  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (connection?.phoneSid && credentials) {
    try {
      await clearTwilioPhoneNumberWebhooks({
        credentials,
        phoneSid: connection.phoneSid,
      });
    } catch (error) {
      console.warn(
        "[twilio] webhook clear failed",
        JSON.stringify({
          businessId,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  const admin = createAdminClient();

  if (connection) {
    await admin.from("twilio_connections").delete().eq("business_id", businessId);
  }

  const existingSettings = await import("@/services/voice-agent.service").then(
    (module) => module.getVoiceAgentSettings(businessId),
  );

  await import("@/services/voice-agent.service").then((module) =>
    module.saveVoiceAgentSettings(businessId, {
    ...existingSettings,
    enabled: false,
    phoneNumber: "",
    twilioPhoneSid: "",
    }),
  );

  revalidateTwilioPaths();
  return { success: true };
}

export async function disconnectTwilioForCurrentUser(): Promise<{
  success: boolean;
  message?: string;
}> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return disconnectTwilioIntegration(businessId);
}

export async function selectTwilioPhoneNumberForCurrentUser(
  phoneSid: string,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return selectTwilioPhoneNumber({ businessId, phoneSid });
}

export async function resyncTwilioForCurrentUser(): Promise<{
  success: boolean;
  message?: string;
}> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return resyncTwilioConnection(businessId);
}
