import "server-only";

import type { Json } from "@/types/database.types";
import { completeTwilioCallSafely } from "@/lib/twilio/client";
import {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
} from "@/lib/twilio/connect";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceRepository } from "@/repositories/voice.repository";
import {
  getTwilioConnection,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import { isActiveVoiceCallStatus } from "@/utils/voice-call-display";

function readCustomerLegCallSid(payload: Json | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const customerCallSid =
    typeof record.customerCallSid === "string" ? record.customerCallSid.trim() : "";

  return customerCallSid || null;
}

async function resolveCustomerLegCallSid(
  businessId: string,
  callLogId: string,
): Promise<string | null> {
  const repo = getVoiceRepository();
  const events = await repo.listCallEvents(businessId, callLogId, 30);

  for (const event of events) {
    if (event.event_type !== "call.customer_leg_created") {
      continue;
    }

    const customerCallSid = readCustomerLegCallSid(event.payload);
    if (customerCallSid) {
      return customerCallSid;
    }
  }

  return null;
}

async function resolveTwilioCredentials(businessId: string) {
  const connection = await getTwilioConnection(businessId);
  const resolved = resolveTwilioCredentialsForBusiness(connection);
  const platformAccountSid = getTwilioPlatformAccountSid();
  const platformAuthToken = getTwilioPlatformAuthToken();

  return (
    resolved ??
    (platformAccountSid && platformAuthToken
      ? { accountSid: platformAccountSid, authToken: platformAuthToken }
      : null)
  );
}

async function terminateTwilioCallSafely(
  credentials: { accountSid: string; authToken: string },
  callSid: string,
): Promise<void> {
  await completeTwilioCallSafely({ credentials, callSid });
}

export async function recordCustomerOutboundLeg(input: {
  businessId: string;
  callLogId: string | null;
  parentCallSid: string;
  customerCallSid: string;
  phoneNumber: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const repo = getVoiceRepository();

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: input.callLogId,
    callSid: input.parentCallSid,
    eventType: "call.customer_leg_created",
    actorType: "system",
    payload: {
      parentCallSid: input.parentCallSid,
      customerCallSid: input.customerCallSid,
      phoneNumber: input.phoneNumber,
    },
  });
}

export async function cancelOutboundVoiceCall(input: {
  businessId: string;
  callLogId?: string;
  parentCallSid?: string;
  customerCallSid?: string;
  phoneNumber?: string;
  reason?: "operator_hangup" | "manual_end";
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const callLogId = input.callLogId?.trim();
  const parentCallSid = input.parentCallSid?.trim();
  const phoneNumber = input.phoneNumber?.trim();

  if (!callLogId && !parentCallSid && !phoneNumber) {
    return { success: false, message: "Missing call identifier." };
  }

  const repo = getVoiceRepository();
  let callLog = callLogId
    ? await repo.findCallLogById(input.businessId, callLogId)
    : null;

  if (!callLog && parentCallSid) {
    const externalMatch = await repo.findCallLogByExternalCallId(parentCallSid);
    if (externalMatch) {
      callLog = await repo.findCallLogById(input.businessId, externalMatch.id);
    }
  }

  if (!callLog && phoneNumber) {
    const activeMatch = await repo.findActiveCallForBusiness(input.businessId, {
      phoneNumber,
    });

    if (activeMatch) {
      callLog = await repo.findCallLogById(input.businessId, activeMatch.id);
    }
  }

  const resolvedParentSid =
    parentCallSid ?? callLog?.external_call_id?.trim() ?? null;

  if (!resolvedParentSid && !callLog) {
    return { success: false, message: "Call not found." };
  }

  const credentials = await resolveTwilioCredentials(input.businessId);

  if (!credentials?.accountSid || !credentials.authToken) {
    return { success: false, message: "Twilio credentials missing." };
  }

  const customerLegSid =
    input.customerCallSid?.trim()
    ?? (callLog?.id
      ? await resolveCustomerLegCallSid(input.businessId, callLog.id)
      : null);

  const callSids = new Set(
    [customerLegSid, resolvedParentSid].filter(
      (value): value is string => Boolean(value?.trim()),
    ),
  );

  for (const callSid of callSids) {
    await terminateTwilioCallSafely(credentials, callSid);
  }

  if (callLog) {
    const wasRinging =
      callLog.status === "ringing"
      || callLog.status === "initiated"
      || callLog.status === "queued";
    const terminalStatus = wasRinging ? "canceled" : "completed";

    if (isActiveVoiceCallStatus(callLog.status)) {
      await repo.updateCallLog(callLog.id, {
        status: terminalStatus,
        endedAt: new Date().toISOString(),
      });
    }

    await repo.insertCallEvent({
      businessId: input.businessId,
      callLogId: callLog.id,
      callSid: resolvedParentSid ?? customerLegSid,
      eventType: "call.ended_by_operator",
      actorType: "operator",
      payload: {
        reason: input.reason ?? "operator_hangup",
        customerLegSid,
        terminalStatus:
          isActiveVoiceCallStatus(callLog.status) ? terminalStatus : callLog.status,
      },
    });
  }

  return { success: true, message: "Call ended." };
}

export async function releaseOperatorVoiceLine(input: {
  businessId: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; message?: string; released: number }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing.", released: 0 };
  }

  const repo = getVoiceRepository();
  const activeCalls = await repo.listActiveHumanCallsForBusiness(input.businessId, {
    phoneNumber: input.phoneNumber,
    limit: 5,
  });

  let released = 0;

  for (const active of activeCalls) {
    const result = await cancelOutboundVoiceCall({
      businessId: input.businessId,
      callLogId: active.id,
      parentCallSid: active.external_call_id ?? undefined,
      phoneNumber: active.phone_number,
      reason: "operator_hangup",
    });

    if (!result.success) {
      return { ...result, released };
    }

    released += 1;
  }

  return {
    success: true,
    message: released > 0 ? "Line released." : "No active operator call.",
    released,
  };
}
