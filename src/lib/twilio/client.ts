import "server-only";

import type {
  TwilioAvailablePhoneNumber,
  TwilioPhoneNumberOption,
} from "@/types/twilio-integration.types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
const TWILIO_MONITOR_BASE = "https://monitor.twilio.com/v1";

export type TwilioApiCredentials = {
  accountSid: string;
  authToken: string;
  apiKeySid?: string;
  apiKeySecret?: string;
};

type TwilioApiError = {
  code?: number;
  message?: string;
  status?: number;
};

export class TwilioApiRequestError extends Error {
  readonly code?: number;
  readonly status: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "TwilioApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function hasTwilioApiCredentials(
  credentials: TwilioApiCredentials | null | undefined,
): credentials is TwilioApiCredentials {
  return Boolean(
    credentials?.accountSid &&
      (credentials.authToken ||
        (credentials.apiKeySid && credentials.apiKeySecret)),
  );
}

export function buildTwilioApiAuthorizationHeader(
  credentials: TwilioApiCredentials,
): string {
  const username = credentials.apiKeySid ?? credentials.accountSid;
  const password = credentials.apiKeySecret ?? credentials.authToken;

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function twilioRequest<T>(
  credentials: TwilioApiCredentials,
  path: string,
  init?: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
  },
): Promise<T> {
  const response = await fetch(`${TWILIO_API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: buildTwilioApiAuthorizationHeader(credentials),
      ...(init?.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init?.body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T &
    TwilioApiError;

  if (!response.ok) {
    throw new TwilioApiRequestError(
      payload.message ?? `Twilio API error (${response.status}).`,
      response.status,
      payload.code,
    );
  }

  return payload;
}

async function twilioMonitorRequest<T>(
  credentials: TwilioApiCredentials,
  path: string,
): Promise<T> {
  const response = await fetch(`${TWILIO_MONITOR_BASE}${path}`, {
    headers: {
      Authorization: buildTwilioApiAuthorizationHeader(credentials),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T &
    TwilioApiError;

  if (!response.ok) {
    throw new TwilioApiRequestError(
      payload.message ?? `Twilio Monitor API error (${response.status}).`,
      response.status,
      payload.code,
    );
  }

  return payload;
}

type IncomingPhoneNumberResource = {
  sid: string;
  phone_number: string;
  friendly_name?: string;
  account_sid?: string;
  voice_url?: string | null;
  voice_method?: string | null;
  voice_application_sid?: string | null;
  sms_url?: string | null;
  sms_method?: string | null;
  sms_application_sid?: string | null;
  status_callback?: string | null;
  status_callback_method?: string | null;
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    mms?: boolean;
  };
};

type IncomingPhoneNumberListResponse = {
  incoming_phone_numbers: IncomingPhoneNumberResource[];
};

type AccountResource = {
  sid: string;
  friendly_name?: string;
  owner_account_sid?: string;
};

export type TwilioIncomingPhoneNumberDetails = {
  sid: string;
  accountSid: string | null;
  phoneNumber: string;
  friendlyName: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  voiceApplicationSid: string | null;
  smsUrl: string | null;
  smsMethod: string | null;
  smsApplicationSid: string | null;
  statusCallback: string | null;
  statusCallbackMethod: string | null;
};

type TwilioApplicationResource = {
  sid: string;
  account_sid?: string;
  friendly_name?: string | null;
  voice_url?: string | null;
  voice_method?: string | null;
  status_callback?: string | null;
  status_callback_method?: string | null;
  sms_url?: string | null;
  sms_method?: string | null;
};

export type TwilioApplicationDetails = {
  sid: string;
  accountSid: string | null;
  friendlyName: string | null;
  voiceUrl: string | null;
  voiceMethod: string | null;
  statusCallback: string | null;
  statusCallbackMethod: string | null;
  smsUrl: string | null;
  smsMethod: string | null;
};

type TwilioMonitorAlertResource = {
  sid: string;
  account_sid?: string;
  alert_text?: string | null;
  error_code?: string | number | null;
  log_level?: string | null;
  request_method?: string | null;
  request_url?: string | null;
  response_body?: string | null;
  date_created?: string | null;
};

type TwilioMonitorAlertsResponse = {
  alerts?: TwilioMonitorAlertResource[];
};

export type TwilioMonitorAlert = {
  sid: string;
  accountSid: string | null;
  alertText: string | null;
  errorCode: string | null;
  logLevel: string | null;
  requestMethod: string | null;
  requestUrl: string | null;
  responseBody: string | null;
  dateCreated: string | null;
};

export async function fetchTwilioAccount(
  credentials: TwilioApiCredentials,
): Promise<AccountResource> {
  return twilioRequest<AccountResource>(
    credentials,
    `/Accounts/${credentials.accountSid}.json`,
  );
}

type TwilioBalanceResource = {
  account_sid: string;
  balance: string;
  currency: string;
};

export type TwilioBalanceResult =
  | { success: true; balance: number; currency: string }
  | { success: false; message: string };

export async function fetchTwilioBalance(
  credentials: TwilioApiCredentials,
): Promise<TwilioBalanceResult> {
  try {
    const data = await twilioRequest<TwilioBalanceResource>(
      credentials,
      `/Accounts/${credentials.accountSid}/Balance.json`,
    );

    const balance = Number.parseFloat(data.balance);

    if (Number.isNaN(balance)) {
      return { success: false, message: "Twilio returned an invalid balance." };
    }

    return {
      success: true,
      balance,
      currency: data.currency ?? "USD",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof TwilioApiRequestError
          ? error.message
          : "Unable to load Twilio balance.",
    };
  }
}

export async function fetchTwilioBalanceForConnection(input: {
  credentials: TwilioApiCredentials;
  parentAccountSid?: string | null;
}): Promise<TwilioBalanceResult & { source: "connected" | "parent" | "none" }> {
  const direct = await fetchTwilioBalance(input.credentials);

  if (direct.success) {
    return { ...direct, source: "connected" };
  }

  const parentSid = input.parentAccountSid?.trim();

  if (!parentSid || parentSid === input.credentials.accountSid) {
    return { ...direct, source: "none" };
  }

  const parentBalance = await fetchTwilioBalance({
    accountSid: parentSid,
    authToken: input.credentials.authToken,
  });

  if (parentBalance.success) {
    return { ...parentBalance, source: "parent" };
  }

  return { ...direct, source: "none" };
}

export async function fetchTwilioIncomingPhoneNumber(
  credentials: TwilioApiCredentials,
  phoneSid: string,
): Promise<TwilioIncomingPhoneNumberDetails> {
  const entry = await twilioRequest<IncomingPhoneNumberResource>(
    credentials,
    `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers/${phoneSid}.json`,
  );

  return {
    sid: entry.sid,
    accountSid: entry.account_sid ?? null,
    phoneNumber: entry.phone_number,
    friendlyName: entry.friendly_name ?? null,
    voiceUrl: entry.voice_url ?? null,
    voiceMethod: entry.voice_method ?? null,
    voiceApplicationSid: entry.voice_application_sid ?? null,
    smsUrl: entry.sms_url ?? null,
    smsMethod: entry.sms_method ?? null,
    smsApplicationSid: entry.sms_application_sid ?? null,
    statusCallback: entry.status_callback ?? null,
    statusCallbackMethod: entry.status_callback_method ?? null,
  };
}

export async function fetchTwilioApplication(
  credentials: TwilioApiCredentials,
  applicationSid: string,
): Promise<TwilioApplicationDetails> {
  const app = await twilioRequest<TwilioApplicationResource>(
    credentials,
    `/Accounts/${credentials.accountSid}/Applications/${applicationSid}.json`,
  );

  return {
    sid: app.sid,
    accountSid: app.account_sid ?? null,
    friendlyName: app.friendly_name ?? null,
    voiceUrl: app.voice_url ?? null,
    voiceMethod: app.voice_method ?? null,
    statusCallback: app.status_callback ?? null,
    statusCallbackMethod: app.status_callback_method ?? null,
    smsUrl: app.sms_url ?? null,
    smsMethod: app.sms_method ?? null,
  };
}

function mapTwilioApplicationDetails(
  app: TwilioApplicationResource,
): TwilioApplicationDetails {
  return {
    sid: app.sid,
    accountSid: app.account_sid ?? null,
    friendlyName: app.friendly_name ?? null,
    voiceUrl: app.voice_url ?? null,
    voiceMethod: app.voice_method ?? null,
    statusCallback: app.status_callback ?? null,
    statusCallbackMethod: app.status_callback_method ?? null,
    smsUrl: app.sms_url ?? null,
    smsMethod: app.sms_method ?? null,
  };
}

function buildTwilioApplicationBody(input: {
  friendlyName: string;
  voiceUrl: string;
  statusCallbackUrl?: string | null;
  smsUrl?: string | null;
}): URLSearchParams {
  const body = new URLSearchParams({
    FriendlyName: input.friendlyName,
    VoiceUrl: input.voiceUrl,
    VoiceMethod: "POST",
    PublicApplicationConnectEnabled: "false",
  });

  if (input.statusCallbackUrl?.trim()) {
    body.set("StatusCallback", input.statusCallbackUrl.trim());
    body.set("StatusCallbackMethod", "POST");
  }

  if (input.smsUrl?.trim()) {
    body.set("SmsUrl", input.smsUrl.trim());
    body.set("SmsMethod", "POST");
  }

  return body;
}

export async function createTwilioApplication(input: {
  credentials: TwilioApiCredentials;
  friendlyName: string;
  voiceUrl: string;
  statusCallbackUrl?: string | null;
  smsUrl?: string | null;
}): Promise<TwilioApplicationDetails> {
  const app = await twilioRequest<TwilioApplicationResource>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Applications.json`,
    {
      method: "POST",
      body: buildTwilioApplicationBody(input),
    },
  );

  return mapTwilioApplicationDetails(app);
}

export async function updateTwilioApplication(input: {
  credentials: TwilioApiCredentials;
  applicationSid: string;
  friendlyName: string;
  voiceUrl: string;
  statusCallbackUrl?: string | null;
  smsUrl?: string | null;
}): Promise<TwilioApplicationDetails> {
  const app = await twilioRequest<TwilioApplicationResource>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Applications/${input.applicationSid}.json`,
    {
      method: "POST",
      body: buildTwilioApplicationBody(input),
    },
  );

  return mapTwilioApplicationDetails(app);
}

export async function listTwilioMonitorAlerts(
  credentials: TwilioApiCredentials,
  limit = 10,
): Promise<TwilioMonitorAlert[]> {
  const params = new URLSearchParams({
    PageSize: String(Math.min(Math.max(limit, 1), 50)),
    LogLevel: "error",
  });
  const response = await twilioMonitorRequest<TwilioMonitorAlertsResponse>(
    credentials,
    `/Alerts?${params.toString()}`,
  );

  return (response.alerts ?? []).map((alert) => ({
    sid: alert.sid,
    accountSid: alert.account_sid ?? null,
    alertText: alert.alert_text ?? null,
    errorCode: alert.error_code == null ? null : String(alert.error_code),
    logLevel: alert.log_level ?? null,
    requestMethod: alert.request_method ?? null,
    requestUrl: alert.request_url ?? null,
    responseBody: alert.response_body ?? null,
    dateCreated: alert.date_created ?? null,
  }));
}

export async function listTwilioIncomingPhoneNumbers(
  credentials: TwilioApiCredentials,
): Promise<TwilioPhoneNumberOption[]> {
  const response = await twilioRequest<IncomingPhoneNumberListResponse>(
    credentials,
    `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
  );

  return (response.incoming_phone_numbers ?? []).map((entry) => ({
    sid: entry.sid,
    phoneNumber: entry.phone_number,
    friendlyName: entry.friendly_name ?? null,
    voiceUrl: entry.voice_url ?? null,
    smsUrl: entry.sms_url ?? null,
    capabilities: {
      voice: entry.capabilities?.voice ?? false,
      sms: entry.capabilities?.sms ?? false,
      mms: entry.capabilities?.mms ?? false,
    },
  }));
}

export async function configureTwilioPhoneNumberWebhooks(input: {
  credentials: TwilioApiCredentials;
  phoneSid: string;
  voiceUrl: string;
  smsUrl?: string;
  statusCallbackUrl?: string;
}): Promise<void> {
  const body = new URLSearchParams({
    VoiceUrl: input.voiceUrl,
    VoiceMethod: "POST",
    StatusCallback: input.statusCallbackUrl ?? input.voiceUrl,
    StatusCallbackMethod: "POST",
  });

  if (input.smsUrl) {
    body.set("SmsUrl", input.smsUrl);
    body.set("SmsMethod", "POST");
  }

  await twilioRequest(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/IncomingPhoneNumbers/${input.phoneSid}.json`,
    { method: "POST", body },
  );
}

export async function clearTwilioPhoneNumberWebhooks(input: {
  credentials: TwilioApiCredentials;
  phoneSid: string;
}): Promise<void> {
  const body = new URLSearchParams({
    VoiceUrl: "",
    VoiceMethod: "POST",
    SmsUrl: "",
    SmsMethod: "POST",
    StatusCallback: "",
    StatusCallbackMethod: "POST",
  });

  await twilioRequest(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/IncomingPhoneNumbers/${input.phoneSid}.json`,
    { method: "POST", body },
  );
}

export async function createTwilioOutboundCall(input: {
  credentials: TwilioApiCredentials;
  from: string;
  to: string;
  twimlUrl: string;
  statusCallbackUrl?: string;
  amdStatusCallbackUrl?: string;
}): Promise<string> {
  const body = new URLSearchParams({
    To: input.to,
    From: input.from,
    Url: input.twimlUrl,
  });

  if (input.statusCallbackUrl) {
    body.set("StatusCallback", input.statusCallbackUrl);
    body.set("StatusCallbackMethod", "POST");
    for (const event of [
      "initiated",
      "ringing",
      "answered",
      "completed",
      "busy",
      "no-answer",
      "failed",
      "canceled",
    ]) {
      body.append("StatusCallbackEvent", event);
    }
  }

  if (input.amdStatusCallbackUrl) {
    body.set("MachineDetection", "Enable");
    body.set("AsyncAmd", "true");
    body.set("AsyncAmdStatusCallback", input.amdStatusCallbackUrl);
    body.set("AsyncAmdStatusCallbackMethod", "POST");
    body.set("MachineDetectionTimeout", "30");
  }

  const response = await twilioRequest<{ sid?: string }>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Calls.json`,
    { method: "POST", body },
  );

  return response.sid ?? "unknown";
}

export async function createTwilioOutboundCallWithTwiml(input: {
  credentials: TwilioApiCredentials;
  from: string;
  to: string;
  twiml: string;
  statusCallbackUrl?: string;
}): Promise<string> {
  const body = new URLSearchParams({
    To: input.to,
    From: input.from,
    Twiml: input.twiml,
  });

  if (input.statusCallbackUrl) {
    body.set("StatusCallback", input.statusCallbackUrl);
    body.set("StatusCallbackMethod", "POST");
    for (const event of [
      "initiated",
      "ringing",
      "answered",
      "completed",
      "busy",
      "no-answer",
      "failed",
      "canceled",
    ]) {
      body.append("StatusCallbackEvent", event);
    }
  }

  const response = await twilioRequest<{ sid?: string }>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Calls.json`,
    { method: "POST", body },
  );

  return response.sid ?? "unknown";
}

export async function completeTwilioCall(input: {
  credentials: TwilioApiCredentials;
  callSid: string;
}): Promise<void> {
  const body = new URLSearchParams({
    Status: "completed",
  });

  await twilioRequest(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Calls/${input.callSid}.json`,
    { method: "POST", body },
  );
}

export async function completeTwilioCallSafely(input: {
  credentials: TwilioApiCredentials;
  callSid: string;
}): Promise<void> {
  try {
    await completeTwilioCall(input);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "unknown";

    if (
      /not found|404|invalid|completed|no longer|finished|canceled|cancelled/.test(
        message,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function redirectTwilioCall(input: {
  credentials: TwilioApiCredentials;
  callSid: string;
  url: string;
}): Promise<void> {
  const body = new URLSearchParams({
    Url: input.url,
    Method: "POST",
  });

  await twilioRequest(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Calls/${input.callSid}.json`,
    { method: "POST", body },
  );
}

export async function updateTwilioConferenceParticipant(input: {
  credentials: TwilioApiCredentials;
  conferenceSid: string;
  participantCallSid: string;
  hold?: boolean;
  muted?: boolean;
  status?: "completed";
}): Promise<void> {
  const body = new URLSearchParams();

  if (input.hold !== undefined) {
    body.set("Hold", input.hold ? "true" : "false");
  }

  if (input.muted !== undefined) {
    body.set("Muted", input.muted ? "true" : "false");
  }

  if (input.status) {
    body.set("Status", input.status);
  }

  if ([...body.keys()].length === 0) {
    return;
  }

  await twilioRequest(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Conferences/${input.conferenceSid}/Participants/${input.participantCallSid}.json`,
    { method: "POST", body },
  );
}

export async function sendTwilioSms(input: {
  credentials: TwilioApiCredentials;
  from: string;
  to: string;
  body: string;
  statusCallbackUrl?: string;
}): Promise<string> {
  const body = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
  });

  if (input.statusCallbackUrl) {
    body.set("StatusCallback", input.statusCallbackUrl);
  }

  const response = await twilioRequest<{ sid?: string }>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Messages.json`,
    { method: "POST", body },
  );

  return response.sid ?? "unknown";
}

type AvailablePhoneNumberResource = {
  phone_number: string;
  friendly_name?: string;
  locality?: string;
  region?: string;
};

type AvailablePhoneNumberListResponse = {
  available_phone_numbers: AvailablePhoneNumberResource[];
};

type PurchasedPhoneNumberResponse = {
  sid: string;
  phone_number: string;
};

export async function searchTwilioAvailablePhoneNumbers(input: {
  credentials: TwilioApiCredentials;
  countryCode: string;
  areaCode?: string;
  limit?: number;
}): Promise<TwilioAvailablePhoneNumber[]> {
  const country = input.countryCode.trim().toUpperCase();
  const params = new URLSearchParams({
    PageSize: String(Math.min(input.limit ?? 10, 20)),
    VoiceEnabled: "true",
    SmsEnabled: "true",
  });

  if (input.areaCode?.trim()) {
    params.set("AreaCode", input.areaCode.trim());
  }

  const response = await twilioRequest<AvailablePhoneNumberListResponse>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`,
  );

  return (response.available_phone_numbers ?? []).map((entry) => ({
    phoneNumber: entry.phone_number,
    friendlyName: entry.friendly_name ?? null,
    locality: entry.locality ?? null,
    region: entry.region ?? null,
  }));
}

export async function purchaseTwilioPhoneNumber(input: {
  credentials: TwilioApiCredentials;
  phoneNumber: string;
}): Promise<{ sid: string; phoneNumber: string }> {
  const body = new URLSearchParams({
    PhoneNumber: input.phoneNumber,
  });

  const response = await twilioRequest<PurchasedPhoneNumberResponse>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/IncomingPhoneNumbers.json`,
    { method: "POST", body },
  );

  return {
    sid: response.sid,
    phoneNumber: response.phone_number,
  };
}
