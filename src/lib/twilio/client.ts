import "server-only";

import type {
  TwilioAvailablePhoneNumber,
  TwilioPhoneNumberOption,
} from "@/types/twilio-integration.types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export type TwilioApiCredentials = {
  accountSid: string;
  authToken: string;
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

function buildAuthHeader(credentials: TwilioApiCredentials): string {
  return `Basic ${Buffer.from(
    `${credentials.accountSid}:${credentials.authToken}`,
  ).toString("base64")}`;
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
      Authorization: buildAuthHeader(credentials),
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

type IncomingPhoneNumberResource = {
  sid: string;
  phone_number: string;
  friendly_name?: string;
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
};

export async function fetchTwilioAccount(
  credentials: TwilioApiCredentials,
): Promise<AccountResource> {
  return twilioRequest<AccountResource>(
    credentials,
    `/Accounts/${credentials.accountSid}.json`,
  );
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
}): Promise<string> {
  const body = new URLSearchParams({
    To: input.to,
    From: input.from,
    Url: input.twimlUrl,
  });

  const response = await twilioRequest<{ sid?: string }>(
    input.credentials,
    `/Accounts/${input.credentials.accountSid}/Calls.json`,
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
