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
  buildTwilioConnectAuthorizeUrl,
  createTwilioConnectState,
  getTwilioConnectAppSid,
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
  hasTwilioConnectEnv,
  hasTwilioPlatformEnv,
} from "@/lib/twilio/connect";
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import {
  getTwilioApiKeySecret,
  getTwilioApiKeySid,
  getTwilioTwimlAppSid,
} from "@/lib/twilio/access-token";
import {
  clearTwilioPhoneNumberWebhooks,
  configureTwilioPhoneNumberWebhooks,
  createTwilioApplication,
  fetchTwilioApplication,
  fetchTwilioAccount,
  fetchTwilioIncomingPhoneNumber,
  listTwilioMonitorAlerts,
  listTwilioIncomingPhoneNumbers,
  purchaseTwilioPhoneNumber,
  searchTwilioAvailablePhoneNumbers,
  updateTwilioApplication,
  type TwilioApiCredentials,
  TwilioApiRequestError,
} from "@/lib/twilio/client";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { registerTwilioNumberBilling } from "@/services/billing-twilio.service";
import {
  deleteIntegrationSecret,
  readIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
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

const BROWSER_PHONE_APP_NAME = "OrzuX Browser Phone";

type TwilioWebhookValidationContext = {
  authToken: string | null;
  expectedAccountSid: string | null;
};

export type TwilioBrowserPhoneRuntimeConfig = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  authToken: string;
  mode: "platform" | "customer";
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
      (row.auth_mode as TwilioConnectionData["authMode"] | undefined) ?? "connect",
    billingOwner:
      (row.billing_owner as TwilioConnectionData["billingOwner"] | undefined) ??
      "customer",
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
  const connectOAuthEnabled = hasTwilioConnectEnv();
  const manualConnectEnabled = hasSupabaseEnv();

  return {
    isConfigured: connectOAuthEnabled || manualConnectEnabled,
    connectOAuthEnabled,
    manualConnectEnabled,
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

  const state = await createTwilioConnectState(businessId);
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

  const credentials = await resolveTwilioCredentialsForBusiness(connection);

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

export async function resolveTwilioCredentialsForBusiness(
  connection: TwilioConnectionData | null,
): Promise<TwilioApiCredentials | null> {
  if (!connection || connection.status === "disconnected") {
    return null;
  }

  if (connection.authMode === "api_key") {
    if (
      !connection.connectedAccountSid ||
      !connection.apiKeySid ||
      !connection.apiKeySecretKeyName
    ) {
      return null;
    }

    const admin = createAdminClient();
    const [apiKeySecret, authToken] = await Promise.all([
      readIntegrationSecret(admin, connection.apiKeySecretKeyName),
      readIntegrationSecret(admin, connection.authTokenSecretKeyName),
    ]);

    if (!apiKeySecret) {
      return null;
    }

    return {
      accountSid: connection.connectedAccountSid,
      authToken: authToken ?? "",
      apiKeySid: connection.apiKeySid,
      apiKeySecret,
    };
  }

  if (connection.authMode === "auth_token") {
    if (!connection.connectedAccountSid || !connection.authTokenSecretKeyName) {
      return null;
    }

    const authToken = await readIntegrationSecret(
      createAdminClient(),
      connection.authTokenSecretKeyName,
    );

    if (!authToken) {
      return null;
    }

    return {
      accountSid: connection.connectedAccountSid,
      authToken,
    };
  }

  const authToken = getTwilioPlatformAuthToken();

  if (!authToken || !connection.connectedAccountSid) {
    return null;
  }

  return {
    accountSid: connection.connectedAccountSid,
    authToken,
  };
}

async function readCustomerTwilioAuthToken(
  connection: TwilioConnectionData | null,
): Promise<string | null> {
  if (!connection?.authTokenSecretKeyName) {
    return null;
  }

  return readIntegrationSecret(
    createAdminClient(),
    connection.authTokenSecretKeyName,
  );
}

export async function resolveTwilioWebhookValidationContext(
  businessId: string,
  options?: { softphoneClient?: boolean },
): Promise<TwilioWebhookValidationContext | null> {
  const connection = await getTwilioConnection(businessId);

  if (!connection || connection.status === "disconnected") {
    return null;
  }

  if (connection.authMode === "api_key" || connection.authMode === "auth_token") {
    return {
      authToken: await readCustomerTwilioAuthToken(connection),
      expectedAccountSid: connection.connectedAccountSid,
    };
  }

  // Connect softphone TwiML Apps live on the OrzuX platform account.
  if (options?.softphoneClient) {
    return {
      authToken: getTwilioPlatformAuthToken() ?? null,
      expectedAccountSid: getTwilioPlatformAccountSid() ?? null,
    };
  }

  return {
    authToken: getTwilioPlatformAuthToken() ?? null,
    expectedAccountSid: connection.connectedAccountSid,
  };
}

export async function resolveTwilioBrowserPhoneRuntimeConfig(
  businessId: string,
): Promise<TwilioBrowserPhoneRuntimeConfig | null> {
  const connection = await getTwilioConnection(businessId);

  if (!isBrowserPhoneSupportedForTwilioConnection(connection)) {
    return null;
  }

  const hasStoredBrowserCredentials = Boolean(
    connection?.connectedAccountSid &&
      connection.apiKeySid &&
      connection.apiKeySecretKeyName &&
      connection.browserTwimlAppSid,
  );

  // Connect softphone uses OrzuX platform API Key + TwiML App (Connect
  // subaccounts cannot create Keys — Twilio returns 20003).
  if (connection?.authMode === "connect") {
    let twimlAppSid = connection.browserTwimlAppSid?.trim() || null;

    if (!twimlAppSid || connection.browserPhoneStatus !== "ready") {
      const credentials = await resolveTwilioCredentialsForBusiness(connection);
      if (credentials) {
        const provisioning = await provisionConnectBrowserPhoneApplication({
          businessId,
          connection,
          credentials,
        });
        if (provisioning.success) {
          twimlAppSid = provisioning.appSid;
        }
      }
    }

    if (!twimlAppSid) {
      twimlAppSid = getTwilioTwimlAppSid()?.trim() || null;
    }

    const accountSid = getTwilioPlatformAccountSid();
    const authToken = getTwilioPlatformAuthToken();
    const apiKeySid = getTwilioApiKeySid();
    const apiKeySecret = getTwilioApiKeySecret();

    if (!accountSid || !authToken || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return null;
    }

    return {
      accountSid,
      apiKeySid,
      apiKeySecret,
      twimlAppSid,
      authToken,
      mode: "platform",
    };
  }

  if (connection?.authMode === "api_key" && hasStoredBrowserCredentials) {
    if (
      !connection.connectedAccountSid ||
      !connection.apiKeySid ||
      !connection.apiKeySecretKeyName ||
      !connection.authTokenSecretKeyName ||
      !connection.browserTwimlAppSid
    ) {
      return null;
    }

    const admin = createAdminClient();
    const [apiKeySecret, authToken] = await Promise.all([
      readIntegrationSecret(admin, connection.apiKeySecretKeyName),
      readIntegrationSecret(admin, connection.authTokenSecretKeyName),
    ]);

    if (!apiKeySecret || !authToken) {
      return null;
    }

    return {
      accountSid: connection.connectedAccountSid,
      apiKeySid: connection.apiKeySid,
      apiKeySecret,
      twimlAppSid: connection.browserTwimlAppSid,
      authToken,
      mode: "customer",
    };
  }

  return null;
}

export function isBrowserPhoneSupportedForTwilioConnection(
  connection: TwilioConnectionData | null,
): boolean {
  if (!connection || connection.status !== "connected") {
    return false;
  }

  const storedBrowserPhoneSupported =
    connection.browserPhoneStatus === "ready" &&
    Boolean(
      connection.connectedAccountSid &&
        connection.apiKeySid &&
        connection.apiKeySecretKeyName &&
        connection.browserTwimlAppSid,
    );

  if (connection.authMode === "connect") {
    // Softphone for Connect uses OrzuX platform keys (Connect ACs cannot create Keys).
    // Show Go Online whenever platform softphone env is present — provision TwiML App lazily.
    return Boolean(
      getTwilioPlatformAccountSid() &&
        getTwilioPlatformAuthToken() &&
        getTwilioApiKeySid() &&
        getTwilioApiKeySecret(),
    );
  }

  if (connection.authMode === "api_key") {
    return (
      connection.billingOwner === "customer" &&
      storedBrowserPhoneSupported &&
      Boolean(connection.authTokenSecretKeyName)
    );
  }

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

function buildBrowserPhoneApplicationUrls(businessId: string) {
  return {
    voiceUrl: buildAppUrl("/api/webhooks/voice/client"),
    statusCallbackUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
      businessId,
    ),
  };
}

function sanitizeTwilioProvisioningError(error: unknown): string {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Twilio Browser Phone provisioning failed.";

  return message.replace(/\s+/g, " ").slice(0, 500);
}

type BrowserPhoneProvisioningResult =
  | { success: true; appSid: string }
  | { success: false; message: string };

async function upsertBrowserPhoneTwimlApplication(input: {
  businessId: string;
  connection: TwilioConnectionData;
  credentials: TwilioApiCredentials;
}): Promise<string> {
  const urls = buildBrowserPhoneApplicationUrls(input.businessId);
  const friendlyName = `${BROWSER_PHONE_APP_NAME} ${input.businessId.slice(0, 8)}`;
  const existingAppSid = input.connection.browserTwimlAppSid?.trim();
  let app: Awaited<ReturnType<typeof createTwilioApplication>>;

  if (existingAppSid) {
    try {
      app = await updateTwilioApplication({
        credentials: input.credentials,
        applicationSid: existingAppSid,
        friendlyName,
        voiceUrl: urls.voiceUrl,
        statusCallbackUrl: urls.statusCallbackUrl,
      });
    } catch (error) {
      const shouldRecreate =
        error instanceof TwilioApiRequestError &&
        (error.status === 404 ||
          error.status === 403 ||
          error.code === 20404 ||
          error.code === 20003);

      if (shouldRecreate) {
        app = await createTwilioApplication({
          credentials: input.credentials,
          friendlyName,
          voiceUrl: urls.voiceUrl,
          statusCallbackUrl: urls.statusCallbackUrl,
        });
      } else {
        throw error;
      }
    }
  } else {
    app = await createTwilioApplication({
      credentials: input.credentials,
      friendlyName,
      voiceUrl: urls.voiceUrl,
      statusCallbackUrl: urls.statusCallbackUrl,
    });
  }

  return app.sid;
}

async function provisionCustomerBrowserPhoneApplication(input: {
  businessId: string;
  connection: TwilioConnectionData;
  credentials: TwilioApiCredentials;
}): Promise<BrowserPhoneProvisioningResult> {
  const admin = createAdminClient();

  await upsertTwilioConnectionRow(admin, input.businessId, {
    browser_phone_status: "pending",
    browser_phone_last_error: null,
  });

  try {
    const appSid = await upsertBrowserPhoneTwimlApplication(input);

    await upsertTwilioConnectionRow(admin, input.businessId, {
      browser_twiml_app_sid: appSid,
      browser_phone_status: "ready",
      browser_phone_last_error: null,
      browser_phone_provisioned_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    });

    return { success: true, appSid };
  } catch (error) {
    const message = sanitizeTwilioProvisioningError(error);

    await upsertTwilioConnectionRow(admin, input.businessId, {
      browser_phone_status: "failed",
      browser_phone_last_error: message,
      browser_phone_provisioned_at: null,
      last_synced_at: new Date().toISOString(),
    });

    console.warn(
      "[twilio] BYOT Browser Phone provisioning failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid: input.credentials.accountSid,
        message,
      }),
    );

    return { success: false, message };
  }
}

async function provisionConnectBrowserPhoneApplication(input: {
  businessId: string;
  connection: TwilioConnectionData;
  credentials: TwilioApiCredentials;
  actorUserId?: string | null;
  actorEmail?: string;
}): Promise<BrowserPhoneProvisioningResult> {
  const admin = createAdminClient();
  const platformAccountSid = getTwilioPlatformAccountSid();
  const platformAuthToken = getTwilioPlatformAuthToken();
  const platformApiKeySid = getTwilioApiKeySid();
  const platformApiKeySecret = getTwilioApiKeySecret();

  await upsertTwilioConnectionRow(admin, input.businessId, {
    browser_phone_status: "pending",
    browser_phone_last_error: null,
  });

  if (
    !platformAccountSid ||
    !platformAuthToken ||
    !platformApiKeySid ||
    !platformApiKeySecret
  ) {
    const message =
      "OrzuX platform softphone keys are missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET). Connect accounts cannot create their own API Keys.";

    await upsertTwilioConnectionRow(admin, input.businessId, {
      browser_phone_status: "failed",
      browser_phone_last_error: message,
      browser_phone_provisioned_at: null,
      last_synced_at: new Date().toISOString(),
    });

    console.warn(
      "[twilio] Connect Browser Phone provisioning failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid: input.credentials.accountSid,
        message,
      }),
    );

    return { success: false, message };
  }

  try {
    // Create/update TwiML App on the OrzuX platform account — Connect
    // "Charge account for usage" cannot create Keys on the connected AC.
    const appSid = await upsertBrowserPhoneTwimlApplication({
      businessId: input.businessId,
      connection: input.connection,
      credentials: {
        accountSid: platformAccountSid,
        authToken: platformAuthToken,
      },
    });

    await upsertTwilioConnectionRow(admin, input.businessId, {
      browser_twiml_app_sid: appSid,
      browser_phone_status: "ready",
      browser_phone_last_error: null,
      browser_phone_provisioned_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    });

    return { success: true, appSid };
  } catch (error) {
    const message = sanitizeTwilioProvisioningError(error);

    await upsertTwilioConnectionRow(admin, input.businessId, {
      browser_phone_status: "failed",
      browser_phone_last_error: message,
      browser_phone_provisioned_at: null,
      last_synced_at: new Date().toISOString(),
    });

    console.warn(
      "[twilio] Connect Browser Phone provisioning failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid: input.credentials.accountSid,
        platformAccountSid,
        message,
      }),
    );

    return { success: false, message };
  }
}

async function provisionBrowserPhoneForConnection(input: {
  businessId: string;
  connection: TwilioConnectionData;
  credentials: TwilioApiCredentials;
}): Promise<BrowserPhoneProvisioningResult | null> {
  if (input.connection.authMode === "connect") {
    return provisionConnectBrowserPhoneApplication(input);
  }

  if (input.connection.authMode === "api_key") {
    return provisionCustomerBrowserPhoneApplication(input);
  }

  return null;
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

  if (alert.errorCode === "11200" && responseBody.includes("Invalid Twilio signature")) {
    if (requestUrl.includes("/api/webhooks/voice/client")) {
      return "Browser Phone TwiML App callback reached OrzuX, but OrzuX rejected X-Twilio-Signature. Re-save the current Auth Token, and confirm the TwiML App Voice URL host matches (www.orzux.com vs orzux.com).";
    }

    return "OrzuX rejected Twilio's X-Twilio-Signature. Usually the saved Auth Token is outdated or from another account — reconnect Twilio with the current Auth Token from Console → Account → API keys & tokens. Also confirm the webhook URL host matches (www.orzux.com vs orzux.com).";
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
  const browserTwimlAppSid =
    connection?.browserTwimlAppSid ?? getTwilioTwimlAppSid() ?? null;

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

  const browserAppCredentials = connection.browserTwimlAppSid
    ? ctx.credentials
    : platformAccountSid && platformAuthToken
      ? { accountSid: platformAccountSid, authToken: platformAuthToken }
      : null;
  const monitorCredentials =
    connection.authMode === "api_key" ||
    connection.authMode === "auth_token" ||
    connection.authMode === "connect"
      ? ctx.credentials
      : platformAccountSid && platformAuthToken
        ? { accountSid: platformAccountSid, authToken: platformAuthToken }
        : null;

  const [numberResult, appResult, alertsResult] = await Promise.allSettled([
    fetchTwilioIncomingPhoneNumber(ctx.credentials, connection.phoneSid),
    browserAppCredentials && browserTwimlAppSid
      ? fetchTwilioApplication(browserAppCredentials, browserTwimlAppSid)
      : Promise.resolve(null),
    monitorCredentials
      ? listTwilioMonitorAlerts(monitorCredentials, 10)
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
  let parentAccountSid: string | null = null;

  try {
    const account = await fetchTwilioAccount(credentials);
    friendlyName = account.friendly_name ?? null;
    parentAccountSid = account.owner_account_sid?.trim() || null;

    if (parentAccountSid === accountSid) {
      parentAccountSid = null;
    }
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

  if (existingConnection?.apiKeySecretKeyName) {
    await deleteIntegrationSecret(admin, existingConnection.apiKeySecretKeyName);
  }

  if (existingConnection?.authTokenSecretKeyName) {
    await deleteIntegrationSecret(admin, existingConnection.authTokenSecretKeyName);
  }

  const connection = await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "authorized",
    auth_mode: "connect",
    billing_owner: "customer",
    connected_account_sid: accountSid,
    parent_account_sid: parentAccountSid,
    api_key_sid: null,
    api_key_secret_key_name: null,
    auth_token_secret_key_name: null,
    browser_twiml_app_sid: null,
    browser_phone_status: "disabled",
    browser_phone_last_error: null,
    browser_phone_provisioned_at: null,
    account_friendly_name: friendlyName,
    phone_number: null,
    phone_sid: null,
    connected_at: null,
    last_synced_at: new Date().toISOString(),
  });

  if (!connection) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  await provisionConnectBrowserPhoneApplication({
    businessId: input.businessId,
    connection,
    credentials,
  });

  revalidateTwilioPaths();
  return { success: true, autoConnected: false };
}

function normalizeTwilioSid(value: string, prefix: "AC" | "SK"): string | null {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed.startsWith(prefix) || trimmed.length !== 34) {
    return null;
  }

  return trimmed;
}

function sanitizeTwilioSecret(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function resolveTwilioAccountSid(
  account: { sid?: string; account_sid?: string },
  fallback: string,
): string {
  return (account.sid ?? account.account_sid ?? fallback).trim().toUpperCase();
}

function formatTwilioConnectError(error: unknown, fallback: string): string {
  if (error instanceof TwilioApiRequestError) {
    if (error.code === 20003 || error.status === 401 || error.status === 403) {
      return (
        "Twilio отклонил учётные данные (код 20003). Проверьте Account SID и Auth Token " +
        "с одной страницы в Twilio Console. Для API Key нужен Main key, не Standard."
      );
    }

    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

export async function connectTwilioWithAuthToken(input: {
  businessId: string;
  accountSid: string;
  authToken: string;
  actorUserId?: string | null;
  actorEmail?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const accountSid = normalizeTwilioSid(input.accountSid, "AC");
  const authToken = sanitizeTwilioSecret(input.authToken);

  if (!accountSid) {
    return { success: false, message: TWILIO_MESSAGES.invalidAccountSid };
  }

  if (authToken.length < 16) {
    return { success: false, message: TWILIO_MESSAGES.invalidAuthToken };
  }

  const credentials: TwilioApiCredentials = {
    accountSid,
    authToken,
  };

  let friendlyName: string | null = null;

  try {
    const account = await fetchTwilioAccount(credentials);
    friendlyName = account.friendly_name ?? null;

    const resolvedAccountSid = resolveTwilioAccountSid(account, accountSid);
    if (resolvedAccountSid !== accountSid) {
      console.warn(
        "[twilio] auth token connect account sid mismatch",
        JSON.stringify({
          businessId: input.businessId,
          expected: accountSid,
          resolved: resolvedAccountSid,
        }),
      );
    }

    await listTwilioIncomingPhoneNumbers(credentials);
  } catch (error) {
    console.warn(
      "[twilio] auth token connect validation failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return {
      success: false,
      message: formatTwilioConnectError(error, TWILIO_MESSAGES.authTokenConnectFailed),
    };
  }

  const admin = createAdminClient();

  const authTokenSecretKeyName = await storeIntegrationSecret(admin, {
    businessId: input.businessId,
    kind: "TWILIO_AUTH_TOKEN",
    value: authToken,
    description: `Twilio Auth Token for business ${input.businessId}`,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });

  if (!authTokenSecretKeyName) {
    return { success: false, message: TWILIO_MESSAGES.authTokenStoreFailed };
  }

  const connection = await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "authorized",
    auth_mode: "auth_token",
    billing_owner: "customer",
    connected_account_sid: accountSid,
    parent_account_sid: null,
    api_key_sid: null,
    api_key_secret_key_name: null,
    auth_token_secret_key_name: authTokenSecretKeyName,
    browser_phone_status: "disabled",
    browser_phone_last_error: null,
    account_friendly_name: friendlyName,
    phone_number: null,
    phone_sid: null,
    connected_at: null,
    last_synced_at: new Date().toISOString(),
  });

  if (!connection) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  revalidateTwilioPaths();
  return { success: true };
}

export async function connectTwilioWithAuthTokenForCurrentUser(input: {
  accountSid: string;
  authToken: string;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return connectTwilioWithAuthToken({
    businessId,
    accountSid: input.accountSid,
    authToken: input.authToken,
    actorUserId: user.id,
    actorEmail: user.email ?? undefined,
  });
}

export async function connectTwilioWithApiKey(input: {
  businessId: string;
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
  actorUserId?: string | null;
  actorEmail?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const accountSid = normalizeTwilioSid(input.accountSid, "AC");
  const apiKeySid = normalizeTwilioSid(input.apiKeySid, "SK");
  const apiKeySecret = sanitizeTwilioSecret(input.apiKeySecret);
  const authToken = sanitizeTwilioSecret(input.authToken);

  if (!accountSid) {
    return { success: false, message: TWILIO_MESSAGES.invalidAccountSid };
  }

  if (!apiKeySid) {
    return { success: false, message: TWILIO_MESSAGES.invalidApiKeySid };
  }

  if (apiKeySecret.length < 16) {
    return { success: false, message: TWILIO_MESSAGES.invalidApiKeySecret };
  }

  if (authToken.length < 16) {
    return { success: false, message: TWILIO_MESSAGES.invalidAuthToken };
  }

  const apiKeyCredentials: TwilioApiCredentials = {
    accountSid,
    authToken: "",
    apiKeySid,
    apiKeySecret,
  };

  const authTokenCredentials: TwilioApiCredentials = {
    accountSid,
    authToken,
  };

  const credentials: TwilioApiCredentials = {
    accountSid,
    authToken,
    apiKeySid,
    apiKeySecret,
  };

  let friendlyName: string | null = null;

  try {
    // Standard API keys cannot call /Accounts — validate via IncomingPhoneNumbers.
    await listTwilioIncomingPhoneNumbers(apiKeyCredentials);

    const account = await fetchTwilioAccount(authTokenCredentials);
    friendlyName = account.friendly_name ?? null;

    await listTwilioIncomingPhoneNumbers(credentials);
  } catch (error) {
    console.warn(
      "[twilio] api key connect validation failed",
      JSON.stringify({
        businessId: input.businessId,
        accountSid,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return {
      success: false,
      message: formatTwilioConnectError(error, TWILIO_MESSAGES.apiKeyConnectFailed),
    };
  }

  const admin = createAdminClient();

  const secretKeyName = await storeIntegrationSecret(admin, {
    businessId: input.businessId,
    kind: "TWILIO_API_KEY_SECRET",
    value: apiKeySecret,
    description: `Twilio API key secret for business ${input.businessId}`,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });

  if (!secretKeyName) {
    return { success: false, message: TWILIO_MESSAGES.apiKeySecretStoreFailed };
  }

  const authTokenSecretKeyName = await storeIntegrationSecret(admin, {
    businessId: input.businessId,
    kind: "TWILIO_AUTH_TOKEN",
    value: authToken,
    description: `Twilio Auth Token for business ${input.businessId}`,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });

  if (!authTokenSecretKeyName) {
    await deleteIntegrationSecret(admin, secretKeyName);
    return { success: false, message: TWILIO_MESSAGES.authTokenStoreFailed };
  }

  const connection = await upsertTwilioConnectionRow(admin, input.businessId, {
    twilio_status: "authorized",
    auth_mode: "api_key",
    billing_owner: "customer",
    connected_account_sid: accountSid,
    parent_account_sid: null,
    api_key_sid: apiKeySid,
    api_key_secret_key_name: secretKeyName,
    auth_token_secret_key_name: authTokenSecretKeyName,
    browser_phone_status: "pending",
    browser_phone_last_error: null,
    account_friendly_name: friendlyName,
    phone_number: null,
    phone_sid: null,
    connected_at: null,
    last_synced_at: new Date().toISOString(),
  });

  if (!connection) {
    return { success: false, message: TWILIO_MESSAGES.saveFailed };
  }

  const provisioning = await provisionCustomerBrowserPhoneApplication({
    businessId: input.businessId,
    connection,
    credentials,
  });

  if (!provisioning.success) {
    return {
      success: false,
      message:
        TWILIO_MESSAGES.browserPhoneProvisionFailed +
        ` ${provisioning.message}`,
    };
  }

  revalidateTwilioPaths();
  return { success: true };
}

export async function connectTwilioWithApiKeyForCurrentUser(input: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TWILIO_MESSAGES.noBusiness };
  }

  return connectTwilioWithApiKey({
    businessId,
    accountSid: input.accountSid,
    apiKeySid: input.apiKeySid,
    apiKeySecret: input.apiKeySecret,
    authToken: input.authToken,
    actorUserId: user.id,
    actorEmail: user.email ?? undefined,
  });
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

  const browserPhoneProvisioning = await provisionBrowserPhoneForConnection({
    businessId: input.businessId,
    connection: ctx.connection,
    credentials: ctx.credentials,
  });

  if (browserPhoneProvisioning && !browserPhoneProvisioning.success) {
    console.warn(
      "[twilio] Browser Phone provisioning skipped during number select",
      JSON.stringify({
        businessId: input.businessId,
        message: browserPhoneProvisioning.message,
      }),
    );
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
    const ctx = await getTwilioCredentialsForBusiness(businessId);

    if (ctx) {
      const provisioning = await provisionBrowserPhoneForConnection({
        businessId,
        connection,
        credentials: ctx.credentials,
      });

      if (provisioning && !provisioning.success) {
        console.warn(
          "[twilio] Browser Phone provisioning skipped during authorized resync",
          JSON.stringify({ businessId, message: provisioning.message }),
        );
      }
    }

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

    const provisioning = await provisionBrowserPhoneForConnection({
      businessId,
      connection,
      credentials: ctx.credentials,
    });

    if (provisioning && !provisioning.success) {
      console.warn(
        "[twilio] Browser Phone provisioning skipped during connected resync",
        JSON.stringify({ businessId, message: provisioning.message }),
      );
    }
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
