import "server-only";

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

const TERMINAL_MISSED_TWILIO_STATUSES = new Set([
  "busy",
  "no-answer",
  "failed",
  "canceled",
]);

const MACHINE_ANSWERED_BY = new Set([
  "machine_start",
  "machine_end_beep",
  "machine_end_silence",
  "fax",
]);

async function resolveTwilioCredentials(businessId: string) {
  const connection = await getTwilioConnection(businessId);
  const resolved = await resolveTwilioCredentialsForBusiness(connection);
  const platformAccountSid = getTwilioPlatformAccountSid();
  const platformAuthToken = getTwilioPlatformAuthToken();

  return (
    resolved ??
    (platformAccountSid && platformAuthToken
      ? { accountSid: platformAccountSid, authToken: platformAuthToken }
      : null)
  );
}

function isAiOutboundCall(callLog: { call_mode?: string | null }): boolean {
  return callLog.call_mode === "ai";
}

export function isTerminalMissedTwilioCallStatus(status: string): boolean {
  return TERMINAL_MISSED_TWILIO_STATUSES.has(status);
}

export function isMachineAnsweredBy(answeredBy: string): boolean {
  return MACHINE_ANSWERED_BY.has(answeredBy.trim().toLowerCase());
}

async function hangUpTwilioCall(businessId: string, callSid: string): Promise<void> {
  const credentials = await resolveTwilioCredentials(businessId);
  if (!credentials) {
    return;
  }

  await completeTwilioCallSafely({ credentials, callSid });
}

async function recordGuardEvent(input: {
  businessId: string;
  callLogId: string;
  callSid: string;
  reason: "status_missed" | "amd_machine";
  rawStatus?: string | null;
  answeredBy?: string | null;
  machineDetectionDuration?: string | null;
}): Promise<void> {
  const repo = getVoiceRepository();

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: input.callLogId,
    callSid: input.callSid,
    eventType: "call.ai_outbound_guard",
    actorType: "system",
    payload: {
      reason: input.reason,
      rawStatus: input.rawStatus ?? null,
      answeredBy: input.answeredBy ?? null,
      machineDetectionDuration: input.machineDetectionDuration ?? null,
    },
  });
}

export async function guardAiOutboundOnMissedStatus(input: {
  businessId: string;
  callSid: string;
  callStatus: string;
}): Promise<void> {
  if (!hasSupabaseEnv() || !isTerminalMissedTwilioCallStatus(input.callStatus)) {
    return;
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (!existing || existing.business_id !== input.businessId) {
    return;
  }

  if (!isAiOutboundCall(existing)) {
    return;
  }

  await hangUpTwilioCall(input.businessId, input.callSid);

  await recordGuardEvent({
    businessId: input.businessId,
    callLogId: existing.id,
    callSid: input.callSid,
    reason: "status_missed",
    rawStatus: input.callStatus,
  });
}

export async function handleTwilioAmdStatusUpdate(input: {
  businessId: string;
  callSid: string;
  answeredBy: string;
  machineDetectionDuration?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv() || !isMachineAnsweredBy(input.answeredBy)) {
    return;
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (!existing || existing.business_id !== input.businessId) {
    return;
  }

  if (!isAiOutboundCall(existing)) {
    return;
  }

  await hangUpTwilioCall(input.businessId, input.callSid);

  if (isActiveVoiceCallStatus(existing.status)) {
    await repo.updateCallLog(existing.id, {
      status: "missed",
      endedAt: new Date().toISOString(),
    });
  }

  await recordGuardEvent({
    businessId: input.businessId,
    callLogId: existing.id,
    callSid: input.callSid,
    reason: "amd_machine",
    answeredBy: input.answeredBy,
    machineDetectionDuration: input.machineDetectionDuration ?? null,
  });
}
