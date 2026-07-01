import "server-only";

import { getTwilioPlatformAccountSid, getTwilioPlatformAuthToken } from "@/lib/twilio/connect";
import { updateTwilioConferenceParticipant } from "@/lib/twilio/client";
import { getVoiceRepository, type VoiceCallEventRow } from "@/repositories/voice.repository";
import type { Json } from "@/types/database.types";

export type ConferenceParticipantAction =
  | "hold"
  | "resume"
  | "mute"
  | "unmute"
  | "remove";

type ConferenceParticipantState = {
  callSid: string;
  conferenceSid: string;
  label: string | null;
  active: boolean;
};

function isRecord(value: Json | unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }

    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  return null;
}

function mapConferenceParticipants(
  events: VoiceCallEventRow[],
): Map<string, ConferenceParticipantState> {
  const participants = new Map<string, ConferenceParticipantState>();

  for (const event of [...events].reverse()) {
    if (!event.event_type.startsWith("conference.") || !isRecord(event.payload)) {
      continue;
    }

    const callSid = getString(event.payload.participantCallSid);
    const conferenceSid = getString(event.payload.conferenceSid);

    if (!callSid || !conferenceSid) {
      continue;
    }

    const existing = participants.get(callSid);
    const eventName = event.event_type.replace(/^conference\./, "");
    const activeFromPayload = getBoolean(event.payload.active);
    const eventMarksInactive =
      eventName === "leave" ||
      eventName === "participant-leave" ||
      eventName === "end" ||
      eventName === "conference-end";
    const active = activeFromPayload ?? (eventMarksInactive ? false : (existing?.active ?? true));

    participants.set(callSid, {
      callSid,
      conferenceSid,
      label: getString(event.payload.participantLabel) ?? existing?.label ?? null,
      active,
    });
  }

  return participants;
}

export async function controlVoiceConferenceParticipant(input: {
  businessId: string;
  callLogId: string;
  conferenceSid: string;
  participantCallSid: string;
  action: ConferenceParticipantAction;
}): Promise<{ success: boolean; message: string }> {
  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogById(input.businessId, input.callLogId);

  if (!callLog) {
    return { success: false, message: "Call not found." };
  }

  const events = await repo.listCallEvents(input.businessId, input.callLogId, 100);
  const participant = mapConferenceParticipants(events).get(input.participantCallSid);

  if (
    !participant ||
    participant.conferenceSid !== input.conferenceSid ||
    !participant.active
  ) {
    return { success: false, message: "Conference participant is not active." };
  }

  const accountSid = getTwilioPlatformAccountSid();
  const authToken = getTwilioPlatformAuthToken();

  if (!accountSid || !authToken) {
    return { success: false, message: "Twilio platform credentials are missing." };
  }

  await updateTwilioConferenceParticipant({
    credentials: { accountSid, authToken },
    conferenceSid: input.conferenceSid,
    participantCallSid: input.participantCallSid,
    hold:
      input.action === "hold"
        ? true
        : input.action === "resume"
          ? false
          : undefined,
    muted:
      input.action === "mute"
        ? true
        : input.action === "unmute"
          ? false
          : undefined,
    status: input.action === "remove" ? "completed" : undefined,
  });

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId: input.callLogId,
    callSid: input.participantCallSid,
    eventType: "conference.control",
    actorType: "operator",
    payload: {
      action: input.action,
      conferenceSid: input.conferenceSid,
      participantCallSid: input.participantCallSid,
      participantLabel: participant.label,
      hold:
        input.action === "hold" ? true : input.action === "resume" ? false : null,
      muted:
        input.action === "mute" ? true : input.action === "unmute" ? false : null,
      active: input.action === "remove" ? false : true,
    },
  });

  return { success: true, message: "Conference participant updated." };
}
