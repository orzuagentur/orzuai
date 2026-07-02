import type { VoiceCallDetail } from "@/types/voice-inbox.types";

export type VoiceWorkspaceView =
  | { mode: "home" }
  | { mode: "dialpad" }
  | { mode: "history" }
  | { mode: "recordings" }
  | { mode: "transcripts" }
  | { mode: "transcript"; callId: string; returnMode?: "home" | "transcripts" }
  | { mode: "live"; callId: string };

export type VoiceWorkspaceContextCall = VoiceCallDetail | null;
