import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import {
  controlVoiceConferenceParticipant,
  type ConferenceParticipantAction,
} from "@/services/voice-conference.service";

const CONFERENCE_PARTICIPANT_ACTIONS = new Set<ConferenceParticipantAction>([
  "hold",
  "resume",
  "mute",
  "unmute",
  "remove",
]);

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing." },
      { status: 503 },
    );
  }

  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business not found." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    callLogId?: string;
    conferenceSid?: string;
    participantCallSid?: string;
    action?: string;
  } | null;

  const callLogId = body?.callLogId?.trim();
  const conferenceSid = body?.conferenceSid?.trim();
  const participantCallSid = body?.participantCallSid?.trim();
  const action = body?.action?.trim() as ConferenceParticipantAction | undefined;

  if (
    !callLogId ||
    !conferenceSid ||
    !participantCallSid ||
    !action ||
    !CONFERENCE_PARTICIPANT_ACTIONS.has(action)
  ) {
    return NextResponse.json(
      { success: false, message: "Missing or invalid conference action fields." },
      { status: 400 },
    );
  }

  const result = await controlVoiceConferenceParticipant({
    businessId: business.id,
    callLogId,
    conferenceSid,
    participantCallSid,
    action,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
  });
}
