"use server";

import { getSecret } from "@orzu/secrets/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

type TwilioCredentials = {
  accountSid: string;
  authToken: string;
};

async function resolveTwilioCredentials(
  businessId: string,
): Promise<TwilioCredentials | null> {
  const service = createServiceRoleClient();

  const [{ data: connection }, authTokenFromVault] = await Promise.all([
    service
      .from("twilio_connections")
      .select("connected_account_sid, twilio_status")
      .eq("business_id", businessId)
      .maybeSingle(),
    getSecret(service, "TWILIO_AUTH_TOKEN"),
  ]);

  const authToken = authTokenFromVault?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();
  const accountSid = connection?.connected_account_sid?.trim();

  if (
    !authToken ||
    !accountSid ||
    connection?.twilio_status === "disconnected"
  ) {
    return null;
  }

  return { accountSid, authToken };
}

async function resolveBusinessSmsFromNumber(
  businessId: string,
): Promise<string | null> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("voice_agent_config")
    .select("phone_number, sms_enabled, enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data?.enabled || !data.sms_enabled) {
    return null;
  }

  return (data.phone_number as string | null)?.trim() || null;
}

async function sendTwilioMessage(input: {
  credentials: TwilioCredentials;
  from: string;
  to: string;
  body: string;
}): Promise<void> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${input.credentials.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${input.credentials.accountSid}:${input.credentials.authToken}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: input.from,
        To: input.to,
        Body: input.body,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message ?? `Twilio error (${response.status}).`);
  }
}

export async function sendTenantSmsFromAdmin(input: {
  businessId: string;
  phoneNumber: string;
  body: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  const to = input.phoneNumber.trim();
  const body = input.body.trim();

  if (!to || to.length < 8) {
    return { success: false, message: "Invalid phone number." };
  }

  if (!body) {
    return { success: false, message: "Message cannot be empty." };
  }

  const [credentials, fromNumber] = await Promise.all([
    resolveTwilioCredentials(input.businessId),
    resolveBusinessSmsFromNumber(input.businessId),
  ]);

  if (!credentials) {
    return { success: false, message: "Twilio is not connected for this business." };
  }

  if (!fromNumber) {
    return { success: false, message: "Business SMS line is not configured." };
  }

  try {
    await sendTwilioMessage({
      credentials,
      from: fromNumber,
      to,
      body,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message.slice(0, 200) : "SMS send failed.",
    };
  }
}
