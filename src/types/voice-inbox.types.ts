import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";

export type VoiceInboxCallListItem = {
  id: string;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  status: string;
  provider: string;
  triggerReason: string | null;
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
};

export type VoiceInboxPageData = {
  hasBusiness: boolean;
  businessId: string | null;
  voiceInboxEnabled: boolean;
  softphoneEnabled: boolean;
  businessPhoneNumber: string | null;
  visibleChannelIds: import("@/types/database.types").MessagingChannel[];
  calls: VoiceInboxCallListItem[];
  activeCall: VoiceCallDetail | null;
};
