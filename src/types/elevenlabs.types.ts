import { z } from "zod";

export const VOICE_REPLY_MODES = ["mirror", "always"] as const;

export type VoiceReplyMode = (typeof VOICE_REPLY_MODES)[number];

export type ElevenLabsVoiceSummary = {
  voiceId: string;
  name: string;
  previewUrl: string | null;
  category: string | null;
  accent: string | null;
  gender: string | null;
  age: string | null;
  description: string | null;
};

export const saveVoiceAgentSettingsSchema = z.object({
  voiceReplyEnabled: z.boolean(),
  elevenlabsVoiceId: z.string().trim().max(120).nullable(),
  elevenlabsVoiceName: z.string().trim().max(120).nullable(),
  voiceReplyMode: z.enum(VOICE_REPLY_MODES),
});

export type SaveVoiceAgentSettingsInput = z.infer<
  typeof saveVoiceAgentSettingsSchema
>;

export type VoiceAgentSettingsData = {
  voiceReplyEnabled: boolean;
  elevenlabsVoiceId: string | null;
  elevenlabsVoiceName: string | null;
  voiceReplyMode: VoiceReplyMode;
};
