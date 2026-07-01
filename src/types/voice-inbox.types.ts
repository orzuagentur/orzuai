import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";
import type { Json } from "@/types/database.types";

export type VoiceInboxCallListItem = {
  id: string;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  status: string;
  provider: string;
  triggerReason: string | null;
  callMode: string;
  operatorUserId: string | null;
  createdAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  aiHandled: boolean;
  humanHandled: boolean;
  handoffAt: string | null;
  contactId: string | null;
  contactName: string | null;
  externalCallId: string | null;
  recordingUrl: string | null;
  conversationId: string | null;
};

export type VoiceCallDetail = VoiceInboxCallListItem & {
  turns: VoiceCallSessionTurn[];
  turnCount: number;
  hasRecording: boolean;
  events: VoiceCallEventItem[];
};

export type VoiceCallEventItem = {
  id: string;
  eventType: string;
  actorType: string;
  payload: Json;
  createdAt: string;
};

export type VoiceInboxPageData = {
  hasBusiness: boolean;
  businessId: string | null;
  voiceInboxEnabled: boolean;
  smsInboxEnabled: boolean;
  softphoneEnabled: boolean;
  businessPhoneNumber: string | null;
  visibleChannelIds: import("@/types/database.types").MessagingChannel[];
  calls: VoiceInboxCallListItem[];
  activeCall: VoiceCallDetail | null;
};
