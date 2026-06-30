import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { TWILIO_MESSAGES } from "@/features/twilio/constants";
import { buildAppUrl } from "@/lib/app-url";
import {
  buildTwilioConnectAuthorizeUrl,
  createTwilioConnectState,
  getTwilioConnectAppSid,
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
  hasTwilioConnectEnv,
  hasTwilioPlatformEnv,
} from "@/lib/twilio/connect";
import { getTwilioTwimlAppSid } from "@/lib/twilio/access-token";
import {
  clearTwilioPhoneNumberWebhooks,
  configureTwilioPhoneNumberWebhooks,
  fetchTwilioApplication,
  fetchTwilioAccount,
  fetchTwilioIncomingPhoneNumber,
  listTwilioMonitorAlerts,
  listTwilioIncomingPhoneNumbers,
  purchaseTwilioPhoneNumber,
  searchTwilioAvailablePhoneNumbers,
  type TwilioApiCredentials,
} from "@/lib/twilio/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { TwilioConnection } from "@/types/database.types";
import type {
  TwilioAvailablePhoneNumber,
  TwilioConnectConfig,
  TwilioConnectionData,
  TwilioErrorLogItem,
  TwilioNumberDiagnostics,
  TwilioPhoneNumberOption,
  TwilioWebhookField,
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

function findPreviouslySelectedNumber(
  numbers: TwilioPhoneNumberOption[],
  connection: TwilioConnectionData | null,
  accountSid: string,
): TwilioPhoneNumberOption | null {
  if (!connection || connection.connectedAccountSid !== accountSid) {
    return null;
  }

  return (
    numbers.find((number) => number.sid === connection.phoneSid) ??
    numbers.find((number) => number.phoneNumber === connection.phoneNumber) ??
    null
  );
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
    deauthorizeRedirectUri: buildAppUrl("/api/integrations/twilio/deauthorize"),
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

  const admin = createAdminClient();
  const { data } = await admin
    .from("twilio_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapTwilioConnection(data) : null;
}

async function getTwilioCredentialsForBusiness(
  businessId: string,
): Promise<{ connection: TwilioConnectionData; credentials: TwilioApiCredentials } | null> {
  const connection = await getTwilioConnection(businessId);

  if (!connection || connection.status === "disconnected") {
    return null;
  }

  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (!credentials) {
    return null;
  }

  return { connection, credentials };
}

export async function getTwilioConnectionByAccountSid(
  connectedAccountSid: string,
): Promise<TwilioConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("twilio_connections")
    .select("*")
    .eq("connected_account_sid", connectedAccountSid)
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
  const result = await refreshTwilioPhoneNumbers(businessId);
  return result.numbers;
}

export async function refreshTwilioPhoneNumbers(
  businessId: string,
): Promise<{
  success: boolean;
  numbers: TwilioPhoneNumberOption[];
  message?: string;
}> {
  const ctx = await getTwilioCredentialsForBusiness(businessId);

  if (!ctx) {
    const connection = await getTwilioConnection(businessId);

    if (!connection || connection.status === "disconnected") {
      return {
        success: false,
        numbers: [],
        message: TWILIO_MESSAGES.notAuthorized,
      };
    }

    return {
      success: false,
      numbers: [],
      message: TWILIO_MESSAGES.platformKeysMissing,
    };
  }

  try {
    const numbers = await listTwilioIncomingPhoneNumbers(ctx.credentials);
    const admin = createAdminClient();

    await upsertTwilioConnectionRow(admin, businessId, {
      last_synced_at: new Date().toISOString(),
    });

    revalidateTwilioPaths();

    return { success: true, numbers };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : TWILIO_MESSAGES.listNumbersFailed;

    console.warn(
      "[twilio] refresh phone numbers failed",
      JSON.stringify({ businessId, message }),
    );

    return {
      success: false,
      numbers: [],
      message,
    };
  }
}

export async function searchAvailableTwilioNumbersForBusiness(input: {
  businessId: string;
  countryCode: string;
  areaCode?: string;
}): Promise<{
  success: boolean;
  numbers: TwilioAvailablePhoneNumber[];
  message?: string;
}> {
  const ctx = await getTwilioCredentialsForBusiness(input.businessId);

  if (!ctx) {
    return {
      success: false,
      numbers: [],
      message: TWILIO_MESSAGES.platformKeysMissing,
    };
  }

  try {
    const numbers = await searchTwilioAvailablePhoneNumbers({
      credentials: ctx.credentials,
      countryCode: input.countryCode,
      areaCode: input.areaCode,
      limit: 10,
    });

    return { success: true, numbers };
  } catch (error) {
    return {
      success: false,
      numbers: [],
      message:
        error instanceof Error
          ? error.message
          : TWILIO_MESSAGES.searchNumbersFailed,
    };
  }
}

export async function purchaseAndConnectTwilioNumber(input: {
  businessId: string;
  phoneNumber: string;
}): Promise<{ success: boolean; message?: string }> {
  const ctx = await getTwilioCredentialsForBusiness(input.businessId);

  if (!ctx) {
    return { success: false, message: TWILIO_MESSAGES.platformKeysMissing };
  }

  try {
    const purchased = await purchaseTwilioPhoneNumber({
      credentials: ctx.credentials,
      phoneNumber: input.phoneNumber,
    });

    return selectTwilioPhoneNumber({
      businessId: input.businessId,
      phoneSid: purchased.sid,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : TWILIO_MESSAGES.purchaseNumberFailed,
    };
  }
}

function buildVoiceWebhookUrls(businessId: string) {
  return {
    inboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
    outboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
    statusCallbackUrl: `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
    smsWebhookUrl: `${buildAppUrl("/api/webhooks/voice/sms")}?businessId=${businessId}`,
  };
}

function buildWebhookField(
  label: string,
  value: string | null,
  expected?: string | null,
): TwilioWebhookField {
  return {
    label,
    value,
    expected,
    ok: expected == null ? true : value === expected,
  };
}

function maskTwilioSid(value: string | null): string | null {
  if (!value || value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function diagnoseTwilioAlert(alert: {
  errorCode: string | null;
  requestUrl: string | null;
  responseBody: string | null;
  alertText: string | null;
}): string {
  const responseBody = alert.responseBody?.trim() ?? "";
  const requestUrl = alert.requestUrl ?? "";

  if (
    alert.errorCode === "11200" &&
    requestUrl.includes("/api/webhooks/voice/client") &&
    responseBody.includes("Invalid Twilio signature")
  ) {
    return "Browser Phone TwiML App callback reached OrzuX, but OrzuX rejected X-Twilio-Signature. The most common non-key cause here is URL mismatch between orzux.com and www.orzux.com for the TwiML App callback.";
  }

  if (alert.errorCode === "11200") {
    return "Twilio reached a webhook URL but received a non-success response. Check the request URL and response body shown below.";
  }

  return alert.alertText ?? "Twilio reported an error. Check the request URL and response body.";
}

function mapErrorLog(alert: {
  sid: string;
  dateCreated: string | null;
  errorCode: string | null;
  alertText: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  responseBody: string | null;
}): TwilioErrorLogItem {
  return {
    sid: alert.sid,
    dateCreated: alert.dateCreated,
    errorCode: alert.errorCode,
    message: alert.alertText ?? "Twilio error",
    requestMethod: alert.requestMethod,
    requestUrl: alert.requestUrl,
    responseBody: alert.responseBody,
    diagnosis: diagnoseTwilioAlert(alert),
  };
}

export async function getTwilioNumberDiagnostics(
  businessId: string,
): Promise<TwilioNumberDiagnostics> {
  const connection = await getTwilioConnection(businessId);
  const webhooks = buildVoiceWebhookUrls(businessId);
  const platformAccountSid = getTwilioPlatformAccountSid() ?? null;
  const platformAuthToken = getTwilioPlatformAuthToken() ?? null;
  const browserTwimlAppSid = getTwilioTwimlAppSid() ?? null;

  const base: TwilioNumberDiagnostics = {
    status: "unavailable",
    summary: "Twilio diagnostics are unavailable until Twilio is connected.",
    connectedAccountSid: connection?.connectedAccountSid ?? null,
    platformAccountSid: maskTwilioSid(platformAccountSid),
    selectedPhoneSid: connection?.phoneSid ?? null,
    selectedPhoneNumber: connection?.phoneNumber ?? null,
    browserTwimlAppSid: maskTwilioSid(browserTwimlAppSid),
    numberFields: [],
    browserAppFields: [],
    errorLogs: [],
  };

  if (!connection || connection.status === "disconnected") {
    return base;
  }

  const ctx = await getTwilioCredentialsForBusiness(businessId);

  if (!ctx || !connection.phoneSid) {
    return {
      ...base,
      status: "warning",
      summary: "Twilio is authorized, but no selected phone number is available.",
    };
  }

  const [numberResult, appResult, alertsResult] = await Promise.allSettled([
    fetchTwilioIncomingPhoneNumber(ctx.credentials, connection.phoneSid),
    platformAccountSid && platformAuthToken && browserTwimlAppSid
      ? fetchTwilioApplication(
          { accountSid: platformAccountSid, authToken: platformAuthToken },
          browserTwimlAppSid,
        )
      : Promise.resolve(null),
    platformAccountSid && platformAuthToken
      ? listTwilioMonitorAlerts(
          { accountSid: platformAccountSid, authToken: platformAuthToken },
          10,
        )
      : Promise.resolve([]),
  ]);

  const number =
    numberResult.status === "fulfilled" ? numberResult.value : null;
  const app = appResult.status === "fulfilled" ? appResult.value : null;
  const alerts =
    alertsResult.status === "fulfilled" ? alertsResult.value : [];

  const numberFields = number
    ? [
        buildWebhookField(
          "Voice URL",
          number.voiceUrl,
          webhooks.inboundWebhookUrl,
        ),
        buildWebhookField("Voice Method", number.voiceMethod, "POST"),
        buildWebhookField("SMS URL", number.smsUrl, webhooks.smsWebhookUrl),
        buildWebhookField("SMS Method", number.smsMethod, "POST"),
        buildWebhookField(
          "Status Callback",
          number.statusCallback,
          webhooks.statusCallbackUrl,
        ),
        buildWebhookField("Status Callback Method", number.statusCallbackMethod, "POST"),
      ]
    : [];

  const browserAppFields = app
    ? [
        buildWebhookField(
          "Browser Phone Voice URL",
          app.voiceUrl,
          buildAppUrl("/api/webhooks/voice/client"),
        ),
        buildWebhookField("Browser Phone Voice Method", app.voiceMethod, "POST"),
      ]
    : [];

  const errorLogs = alerts.map(mapErrorLog).filter((alert) => {
    const url = alert.requestUrl ?? "";
    return url.includes("/api/webhooks/voice") || alert.errorCode === "11200";
  });
  const hasInvalidSignature = errorLogs.some((alert) =>
    alert.responseBody?.includes("Invalid Twilio signature"),
  );
  const hasFieldMismatch = [...numberFields, ...browserAppFields].some(
    (field) => field.ok === false,
  );

  return {
    ...base,
    status: hasInvalidSignature || hasFieldMismatch ? "error" : "ok",
    summary: hasInvalidSignature
      ? "Latest Twilio error is an invalid webhook signature on the Browser Phone TwiML App callback."
      : hasFieldMismatch
        ? "One or more Twilio webhook settings do not match the expected OrzuX configuration."
        : "Selected phone number webhooks and Browser Phone TwiML App settings match the expected OrzuX configuration.",
    numberFields,
    browserAppFields,
    errorLogs,
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
}): Promise<{ success: boolean; message?: string; autoConnected?: boolean }> {
  if (!hasSupabaseEnv() || !hasTwilioPlatformEnv()) {
    return { success: false, message: TWILIO_MESSAGES.notConfiguredTitle };
  }

  const accountSid = input.connectedAccountSid.trim();

  if (!accountSid.startsWith("AC")) {
    return { success: false, message: TWILIO_MESSAGES.invalidAccountSid };
  }

  const admin = createAdminClient();
  const existingConnection = await getTwilioConnection(input.businessId);
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

  const numbers = await listTwilioIncomingPhoneNumbers(credentials);
  const previouslySelectedNumber = findPreviouslySelectedNumber(
    numbers,
    existingConnection,
    accountSid,
  );

  await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "authorized",
    connected_account_sid: accountSid,
    account_friendly_name: friendlyName,
    phone_number: previouslySelectedNumber?.phoneNumber ?? null,
    phone_sid: previouslySelectedNumber?.sid ?? null,
    connected_at: null,
    last_synced_at: new Date().toISOString(),
  });

  if (previouslySelectedNumber) {
    const preservedResult = await selectTwilioPhoneNumber({
      businessId: input.businessId,
      phoneSid: previouslySelectedNumber.sid,
      phoneNumber: previouslySelectedNumber.phoneNumber,
    });

    if (preservedResult.success) {
      revalidateTwilioPaths();
      return {
        success: true,
        autoConnected: true,
        message: "Twilio подключён — предыдущий номер восстановлен автоматически.",
      };
    }
  }

  if (numbers.length === 1) {
    const singleNumber = numbers[0];
    if (singleNumber) {
      const autoResult = await selectTwilioPhoneNumber({
        businessId: input.businessId,
        phoneSid: singleNumber.sid,
        phoneNumber: singleNumber.phoneNumber,
      });

      if (autoResult.success) {
        revalidateTwilioPaths();
        return {
          success: true,
          autoConnected: true,
          message: TWILIO_MESSAGES.autoConnectedSingleNumber,
        };
      }
    }
  }

  revalidateTwilioPaths();
  return { success: true, autoConnected: false };
}

export async function selectTwilioPhoneNumber(input: {
  businessId: string;
  phoneSid: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const ctx = await getTwilioCredentialsForBusiness(input.businessId);

  if (!ctx) {
    return {
      success: false,
      message: TWILIO_MESSAGES.notAuthorized,
    };
  }

  let selectedNumber = input.phoneNumber;
  let selectedSid = input.phoneSid;

  if (!selectedNumber) {
    const numbers = await listTwilioIncomingPhoneNumbers(ctx.credentials);
    const selected = numbers.find((entry) => entry.sid === input.phoneSid);

    if (!selected) {
      return { success: false, message: TWILIO_MESSAGES.phoneNotFound };
    }

    selectedNumber = selected.phoneNumber;
    selectedSid = selected.sid;
  }

  const webhooks = buildVoiceWebhookUrls(input.businessId);
  const now = new Date().toISOString();

  try {
    await configureTwilioPhoneNumberWebhooks({
      credentials: ctx.credentials,
      phoneSid: selectedSid,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.smsWebhookUrl,
      statusCallbackUrl: webhooks.statusCallbackUrl,
    });
  } catch (error) {
    console.error(
      "[twilio] webhook setup failed",
      JSON.stringify({
        businessId: input.businessId,
        phoneSid: selectedSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return { success: false, message: TWILIO_MESSAGES.webhookSetupFailed };
  }

  const admin = createAdminClient();

  await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "connected",
    phone_number: selectedNumber,
    phone_sid: selectedSid,
    connected_at: ctx.connection.connectedAt ?? now,
    last_synced_at: now,
  });

  const voiceSettingsResult = await import("@/services/voice-agent.service").then(
    (module) =>
      module.saveVoiceAgentSettings(input.businessId, {
    enabled: true,
    provider: "twilio",
    phoneNumber: selectedNumber,
    outboundEnabled: true,
    inboundEnabled: true,
    callbackAfterOrder: true,
    callbackDelayMinutes: 5,
    outboundScript:
      "Hello! This is your AI assistant calling to confirm your order and see if you have any questions.",
    inboundGreeting: "Thank you for calling. How can we help you today?",
    retellAgentId: "",
    vapiAssistantId: "",
    twilioPhoneSid: selectedSid,
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

  if (!connection) {
    return { success: false, message: TWILIO_MESSAGES.notAuthorized };
  }

  if (connection.status === "authorized") {
    const refreshed = await refreshTwilioPhoneNumbers(businessId);
    return {
      success: refreshed.success,
      message: refreshed.success
        ? TWILIO_MESSAGES.refreshSuccess
        : refreshed.message ?? TWILIO_MESSAGES.refreshFailed,
    };
  }

  if (!connection.phoneSid || connection.status !== "connected") {
    return { success: false, message: TWILIO_MESSAGES.notConnected };
  }

  const ctx = await getTwilioCredentialsForBusiness(businessId);

  if (!ctx) {
    return { success: false, message: TWILIO_MESSAGES.platformKeysMissing };
  }

  const webhooks = buildVoiceWebhookUrls(businessId);

  try {
    await configureTwilioPhoneNumberWebhooks({
      credentials: ctx.credentials,
      phoneSid: connection.phoneSid,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.smsWebhookUrl,
      statusCallbackUrl: webhooks.statusCallbackUrl,
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

export async function handleTwilioConnectDeauthorization(input: {
  accountSid: string;
  connectAppSid?: string | null;
}): Promise<{ success: boolean; processed: boolean }> {
  const accountSid = input.accountSid.trim();
  const expectedConnectAppSid = getTwilioConnectAppSid();

  if (!accountSid.startsWith("AC")) {
    return { success: false, processed: false };
  }

  if (
    input.connectAppSid &&
    expectedConnectAppSid &&
    input.connectAppSid !== expectedConnectAppSid
  ) {
    console.warn(
      "[twilio] deauthorize ignored — ConnectAppSid mismatch",
      JSON.stringify({
        received: input.connectAppSid,
      }),
    );
    return { success: false, processed: false };
  }

  const connection = await getTwilioConnectionByAccountSid(accountSid);

  if (!connection) {
    return { success: true, processed: false };
  }

  await disconnectTwilioIntegration(connection.businessId, {
    skipWebhookCleanup: true,
  });

  console.info(
    "[twilio] deauthorized",
    JSON.stringify({
      businessId: connection.businessId,
      accountSid,
    }),
  );

  return { success: true, processed: true };
}

export async function disconnectTwilioIntegration(
  businessId: string,
  options?: { skipWebhookCleanup?: boolean },
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const connection = await getTwilioConnection(businessId);
  const credentials = resolveTwilioCredentialsForBusiness(connection);

  if (connection?.phoneSid && credentials && !options?.skipWebhookCleanup) {
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
    await upsertTwilioConnectionRow(admin, businessId, {
      twilio_status: "disconnected",
      connected_at: null,
      last_synced_at: new Date().toISOString(),
    });
  }

  const existingSettings = await import("@/services/voice-config.service").then(
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

export async function refreshTwilioForCurrentUser(): Promise<{
  success: boolean;
  message?: string;
  numbers?: TwilioPhoneNumberOption[];
}> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  const result = await refreshTwilioPhoneNumbers(businessId);
  return {
    success: result.success,
    message: result.success
      ? TWILIO_MESSAGES.refreshSuccess
      : result.message ?? TWILIO_MESSAGES.refreshFailed,
    numbers: result.numbers,
  };
}

export async function searchAvailableTwilioNumbersForCurrentUser(input: {
  countryCode: string;
  areaCode?: string;
}): Promise<{
  success: boolean;
  numbers: TwilioAvailablePhoneNumber[];
  message?: string;
}> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, numbers: [], message: TWILIO_MESSAGES.noBusiness };
  }

  return searchAvailableTwilioNumbersForBusiness({
    businessId,
    countryCode: input.countryCode,
    areaCode: input.areaCode,
  });
}

export async function purchaseTwilioNumberForCurrentUser(
  phoneNumber: string,
): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return purchaseAndConnectTwilioNumber({ businessId, phoneNumber });
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
