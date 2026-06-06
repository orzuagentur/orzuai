import { z } from "zod";

export const VOICE_PROVIDERS = ["twilio", "retell", "vapi"] as const;

export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export const connectVoiceAgentSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number.")
    .max(32)
    .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +380501234567"),
});

export type ConnectVoiceAgentInput = z.infer<typeof connectVoiceAgentSchema>;

export type VoiceConnectionStatus = "connected" | "pending" | "disconnected";

export type VoiceConnectionData = {
  status: VoiceConnectionStatus;
  phoneNumber: string | null;
  enabled: boolean;
  callbackAfterOrder: boolean;
};

export type VoiceConnectConfig = {
  isConfigured: boolean;
};

export const saveVoiceAgentSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(VOICE_PROVIDERS),
  phoneNumber: z.string().trim().max(32).optional().default(""),
  outboundEnabled: z.boolean(),
  inboundEnabled: z.boolean(),
  callbackAfterOrder: z.boolean(),
  callbackDelayMinutes: z.number().int().min(0).max(1440),
  outboundScript: z.string().trim().min(10).max(2000),
  inboundGreeting: z.string().trim().min(10).max(2000),
  retellAgentId: z.string().trim().max(128).optional().default(""),
  vapiAssistantId: z.string().trim().max(128).optional().default(""),
  twilioPhoneSid: z.string().trim().max(64).optional().default(""),
});

export type SaveVoiceAgentSettingsInput = z.infer<
  typeof saveVoiceAgentSettingsSchema
>;

export type VoiceAgentSettings = {
  enabled: boolean;
  provider: VoiceProvider;
  phoneNumber: string;
  outboundEnabled: boolean;
  inboundEnabled: boolean;
  callbackAfterOrder: boolean;
  callbackDelayMinutes: number;
  outboundScript: string;
  inboundGreeting: string;
  retellAgentId: string;
  vapiAssistantId: string;
  twilioPhoneSid: string;
  providerConfigured: boolean;
  inboundWebhookUrl: string;
  outboundWebhookUrl: string;
};

export type VoiceCallLogItem = {
  id: string;
  direction: "outbound" | "inbound";
  phoneNumber: string;
  status: string;
  provider: string;
  triggerReason: string | null;
  createdAt: string;
};
