import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getTwilioCountryPricing,
  inferCountryCodeFromPhoneNumber,
} from "@/features/twilio/country-pricing";
import { TWILIO_MESSAGES } from "@/features/twilio/constants";
import { buildAppUrl } from "@/lib/app-url";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
  hasTwilioPlatformEnv,
} from "@/lib/twilio/platform";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import {
  clearTwilioPhoneNumberWebhooks,
  configureTwilioPhoneNumberWebhooks,
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
import { registerTwilioNumberBilling } from "@/services/billing-twilio.service";
import { deleteIntegrationSecret } from "@/services/integration-secrets.service";
import type { TwilioConnection } from "@/types/database.types";
import type {
  TwilioAvailablePhoneNumber,
  TwilioBrowserPhoneStatus,
  TwilioConnectConfig,
  TwilioConnectionData,
  TwilioErrorLogItem,
  TwilioNumberDiagnostics,
  TwilioPhoneNumberOption,
  TwilioWebhookField,
} from "@/types/twilio-integration.types";

type AdminClient = ReturnType<typeof createAdminClient>;

type TwilioWebhookValidationContext = {
  authToken: string | null;
  expectedAccountSid: string | null;
  allowedAccountSids?: string[];
};

function mapBrowserPhoneStatus(
  value: string | null | undefined,
): TwilioBrowserPhoneStatus {
  if (
    value === "disabled" ||
    value === "pending" ||
    value === "ready" ||
    value === "failed"
  ) {
    return value;
  }

  return "disabled";
}

function revalidateTwilioPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/voice`);
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
  revalidatePath(DASHBOARD_ROUTES.subscriptionTwilio);
}

function mapTwilioConnection(row: TwilioConnection): TwilioConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.twilio_status,
    authMode:
      (row.auth_mode as TwilioConnectionData["authMode"] | undefined) ?? "platform",
    billingOwner:
      (row.billing_owner as TwilioConnectionData["billingOwner"] | undefined) ??
      "platform",
    connectedAccountSid: row.connected_account_sid,
    parentAccountSid: row.parent_account_sid ?? null,
    apiKeySid: row.api_key_sid ?? null,
    apiKeySecretKeyName: row.api_key_secret_key_name ?? null,
    authTokenSecretKeyName: row.auth_token_secret_key_name ?? null,
    browserTwimlAppSid: row.browser_twiml_app_sid ?? null,
    browserPhoneStatus: mapBrowserPhoneStatus(row.browser_phone_status),
    browserPhoneLastError: row.browser_phone_last_error ?? null,
    browserPhoneProvisionedAt: row.browser_phone_provisioned_at ?? null,
    hasApiKeySecret: Boolean(row.api_key_secret_key_name),
    hasAuthTokenSecret: Boolean(row.auth_token_secret_key_name),
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
  const platformReady = hasTwilioPlatformEnv();

  return {
    isConfigured: platformReady,
    connectOAuthEnabled: false,
    manualConnectEnabled: false,
    connectUrl: "/api/integrations/twilio/connect",
    authorizeRedirectUri: buildAppUrl("/api/integrations/twilio/callback"),
    deauthorizeRedirectUri: buildAppUrl("/api/integrations/twilio/deauthorize"),
  };
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
  const credentials = getPlatformTwilioCredentials();

  if (!credentials) {
    return null;
  }

  let connection = await getTwilioConnection(businessId);

  if (!connection || connection.status === "disconnected") {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    connection = await upsertTwilioConnectionRow(admin, businessId, {
      twilio_status: "authorized",
      auth_mode: "platform",
      billing_owner: "platform",
      connected_account_sid: credentials.accountSid,
      parent_account_sid: null,
      account_friendly_name: "OrzuX Platform",
      api_key_sid: null,
      api_key_secret_key_name: null,
      auth_token_secret_key_name: null,
      browser_twiml_app_sid: null,
      browser_phone_status: "disabled",
      browser_phone_last_error: null,
      connected_at: now,
      last_synced_at: now,
    });
  }

  if (!connection) {
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

function getPlatformTwilioCredentials(): TwilioApiCredentials | null {
  const accountSid = getTwilioPlatformAccountSid();
  const authToken = getTwilioPlatformAuthToken();

  if (!accountSid || !authToken) {
    return null;
  }

  return { accountSid, authToken };
}

/** HeyKiki model: all voice/SMS traffic uses OrzuX platform Twilio credentials. */
export async function resolveTwilioCredentialsForBusiness(
  connection: TwilioConnectionData | null,
): Promise<TwilioApiCredentials | null> {
  if (!connection || connection.status === "disconnected") {
    return null;
  }

  return getPlatformTwilioCredentials();
}

export async function resolveTwilioWebhookValidationContext(
  businessId: string,
): Promise<TwilioWebhookValidationContext | null> {
  const connection = await getTwilioConnection(businessId);

  if (!connection || connection.status === "disconnected") {
    return null;
  }

  const platformAccountSid = getTwilioPlatformAccountSid() ?? null;

  return {
    authToken: getTwilioPlatformAuthToken() ?? null,
    expectedAccountSid: platformAccountSid,
    allowedAccountSids: platformAccountSid ? [platformAccountSid] : undefined,
  };
}

/** Softphone removed — OrzuX uses platform numbers + Rufweiterleitung (HeyKiki model). */
export function isBrowserPhoneSupportedForTwilioConnection(
  connection: TwilioConnectionData | null,
): boolean {
  void connection;
  return false;
}

export async function listTwilioPhoneNumbersForBusiness(
  businessId: string,
): Promise<TwilioPhoneNumberOption[]> {
  const result = await refreshTwilioPhoneNumbers(businessId);
  return result.numbers;
}

export async function refreshTwilioPhoneNumbers(
  businessId: string,
  options: { revalidate?: boolean } = {},
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

    if (options.revalidate) {
      revalidateTwilioPaths();
    }

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
  countryCode?: string;
}): Promise<{ success: boolean; message?: string }> {
  const ctx = await getTwilioCredentialsForBusiness(input.businessId);

  if (!ctx) {
    return { success: false, message: TWILIO_MESSAGES.platformKeysMissing };
  }

  const countryCode =
    input.countryCode?.trim().toUpperCase() ||
    inferCountryCodeFromPhoneNumber(input.phoneNumber);
  const pricing = getTwilioCountryPricing(countryCode);

  if (!pricing) {
    return {
      success: false,
      message: "Phone numbers for this country are not available yet.",
    };
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("stripe_subscription_id, subscription_status")
    .eq("id", input.businessId)
    .maybeSingle();

  const billingStatus = business?.subscription_status?.trim().toLowerCase();

  if (
    !business?.stripe_subscription_id ||
    (billingStatus !== "active" && billingStatus !== "trialing")
  ) {
    return {
      success: false,
      message:
        "Upgrade to an active paid plan before purchasing a phone number.",
    };
  }

  try {
    const purchased = await purchaseTwilioPhoneNumber({
      credentials: ctx.credentials,
      phoneNumber: input.phoneNumber,
    });

    const billingResult = await registerTwilioNumberBilling({
      businessId: input.businessId,
      phoneNumber: purchased.phoneNumber,
      phoneSid: purchased.sid,
      countryCode,
      monthlyPriceCents: pricing.monthlyPriceCents,
      stripeSubscriptionId: business.stripe_subscription_id,
    });

    if (!billingResult.success) {
      try {
        await clearTwilioPhoneNumberWebhooks({
          credentials: ctx.credentials,
          phoneSid: purchased.sid,
        });
      } catch {
        // Best-effort rollback if billing fails after Twilio purchase.
      }

      return {
        success: false,
        message:
          billingResult.message ??
          "Number purchased on Twilio but billing could not be activated.",
      };
    }

    const { upsertActiveOrzuVoiceNumber } = await import(
      "@/services/orzu-voice-numbers.service"
    );
    await upsertActiveOrzuVoiceNumber({
      businessId: input.businessId,
      phoneNumber: purchased.phoneNumber,
      phoneSid: purchased.sid,
      countryCode,
      monthlyPriceCents: pricing.monthlyPriceCents,
    });

    return selectTwilioPhoneNumber({
      businessId: input.businessId,
      phoneSid: purchased.sid,
      phoneNumber: purchased.phoneNumber,
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
    inboundWebhookUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
      businessId,
    ),
    outboundWebhookUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
      businessId,
    ),
    statusCallbackUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
      businessId,
    ),
    smsWebhookUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/sms")}?businessId=${businessId}`,
      businessId,
    ),
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

  if (alert.errorCode === "11200" && responseBody.includes("Invalid Twilio signature")) {
    return "OrzuX rejected Twilio's X-Twilio-Signature. Confirm platform TWILIO_AUTH_TOKEN matches the OrzuX Twilio account and webhook URL host matches (www.orzux.com vs orzux.com).";
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

  const base: TwilioNumberDiagnostics = {
    status: "unavailable",
    summary: "Twilio diagnostics are unavailable until Twilio is connected.",
    connectedAccountSid: connection?.connectedAccountSid ?? null,
    platformAccountSid: maskTwilioSid(platformAccountSid),
    selectedPhoneSid: connection?.phoneSid ?? null,
    selectedPhoneNumber: connection?.phoneNumber ?? null,
    browserTwimlAppSid: null,
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

  const monitorCredentials = getPlatformTwilioCredentials();

  const [numberResult, alertsResult] = await Promise.allSettled([
    fetchTwilioIncomingPhoneNumber(ctx.credentials, connection.phoneSid),
    monitorCredentials
      ? listTwilioMonitorAlerts(monitorCredentials, 10)
      : Promise.resolve([]),
  ]);

  const number =
    numberResult.status === "fulfilled" ? numberResult.value : null;
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

  const errorLogs = alerts.map(mapErrorLog).filter((alert) => {
    const url = alert.requestUrl ?? "";
    return url.includes("/api/webhooks/voice") || alert.errorCode === "11200";
  });
  const hasInvalidSignature = errorLogs.some((alert) =>
    alert.responseBody?.includes("Invalid Twilio signature"),
  );
  const hasFieldMismatch = numberFields.some((field) => field.ok === false);

  return {
    ...base,
    status: hasInvalidSignature || hasFieldMismatch ? "error" : "ok",
    summary: hasInvalidSignature
      ? "Latest Twilio error is an invalid webhook signature on a voice webhook."
      : hasFieldMismatch
        ? "One or more Twilio webhook settings do not match the expected OrzuX configuration."
        : "Selected phone number webhooks match the expected OrzuX configuration.",
    numberFields,
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
  let cleanupPreviousNumber = false;

  try {
    await configureTwilioPhoneNumberWebhooks({
      credentials: ctx.credentials,
      phoneSid: selectedSid,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.smsWebhookUrl,
      statusCallbackUrl: webhooks.statusCallbackUrl,
    });

    if (ctx.connection.phoneSid && ctx.connection.phoneSid !== selectedSid) {
      cleanupPreviousNumber = true;
      await clearTwilioPhoneNumberWebhooks({
        credentials: ctx.credentials,
        phoneSid: ctx.connection.phoneSid,
      });
    }
  } catch (error) {
    console.error(
      "[twilio] webhook setup failed",
      JSON.stringify({
        businessId: input.businessId,
        phoneSid: selectedSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return {
      success: false,
      message: cleanupPreviousNumber
        ? TWILIO_MESSAGES.oldWebhookCleanupFailed
        : TWILIO_MESSAGES.webhookSetupFailed,
    };
  }

  const admin = createAdminClient();

  await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "connected",
    auth_mode: "platform",
    billing_owner: "platform",
    connected_account_sid: ctx.credentials.accountSid,
    phone_number: selectedNumber,
    phone_sid: selectedSid,
    connected_at: ctx.connection.connectedAt ?? now,
    last_synced_at: now,
  });

  try {
    const { upsertActiveOrzuVoiceNumber } = await import(
      "@/services/orzu-voice-numbers.service"
    );
    const countryCode = inferCountryCodeFromPhoneNumber(selectedNumber);
    const pricing = getTwilioCountryPricing(countryCode);
    await upsertActiveOrzuVoiceNumber({
      businessId: input.businessId,
      phoneNumber: selectedNumber,
      phoneSid: selectedSid,
      countryCode,
      monthlyPriceCents: pricing?.monthlyPriceCents ?? 250,
      voiceUrl: webhooks.inboundWebhookUrl,
      smsUrl: webhooks.smsWebhookUrl,
    });
  } catch (error) {
    console.warn(
      "[twilio] orzu_voice_numbers upsert failed",
      JSON.stringify({
        businessId: input.businessId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }

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
    const refreshed = await refreshTwilioPhoneNumbers(businessId, {
      revalidate: true,
    });
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

export async function disconnectTwilioIntegration(
  businessId: string,
  options?: { skipWebhookCleanup?: boolean },
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const connection = await getTwilioConnection(businessId);
  const credentials = await resolveTwilioCredentialsForBusiness(connection);

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

  try {
    const { releaseActiveOrzuVoiceNumber } = await import(
      "@/services/orzu-voice-numbers.service"
    );
    await releaseActiveOrzuVoiceNumber(businessId);
  } catch (error) {
    console.warn(
      "[twilio] orzu_voice_numbers release failed",
      JSON.stringify({
        businessId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }

  const admin = createAdminClient();

  if (connection) {
    if (connection.apiKeySecretKeyName) {
      await deleteIntegrationSecret(admin, connection.apiKeySecretKeyName);
    }

    if (connection.authTokenSecretKeyName) {
      await deleteIntegrationSecret(admin, connection.authTokenSecretKeyName);
    }

    await upsertTwilioConnectionRow(admin, businessId, {
      twilio_status: "disconnected",
      connected_account_sid: null,
      parent_account_sid: null,
      api_key_sid: null,
      api_key_secret_key_name: null,
      auth_token_secret_key_name: null,
      browser_twiml_app_sid: null,
      browser_phone_status: "disabled",
      browser_phone_last_error: null,
      browser_phone_provisioned_at: null,
      phone_number: null,
      phone_sid: null,
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

  const result = await refreshTwilioPhoneNumbers(businessId, {
    revalidate: true,
  });
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

export async function purchaseTwilioNumberForCurrentUser(input: {
  phoneNumber: string;
  countryCode?: string;
}): Promise<{ success: boolean; message?: string }> {
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return purchaseAndConnectTwilioNumber({
    businessId,
    phoneNumber: input.phoneNumber,
    countryCode: input.countryCode,
  });
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
