import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import { isVoiceAiConfigured } from "@/lib/voice/ai-config";
import { hasTwilioPlatformEnv } from "@/lib/twilio/connect";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { getTwilioConnection } from "@/services/twilio-integration.service";
import type { VoiceAgentSettings, VoiceProvider } from "@/types/voice-agent.types";

const DEFAULT_SETTINGS: Omit<
  VoiceAgentSettings,
  | "providerConfigured"
  | "aiConfigured"
  | "inboundWebhookUrl"
  | "outboundWebhookUrl"
> = {
  enabled: false,
  provider: "twilio",
  phoneNumber: "",
  outboundEnabled: true,
  inboundEnabled: true,
  callbackAfterOrder: true,
  callbackDelayMinutes: 5,
  outboundScript:
    "Hello! This is your AI assistant calling to confirm your order and see if you have any questions.",
  inboundGreeting: "Thank you for calling. How can we help you today?",
  retellAgentId: "",
  vapiAssistantId: "",
  twilioPhoneSid: "",
  aiEnabled: true,
  voiceLanguage: "English",
  voiceSystemPrompt: "",
  recordingEnabled: true,
  smsEnabled: true,
  businessHoursEnabled: false,
  businessHoursStart: "09:00",
  businessHoursEnd: "18:00",
  businessTimezone: "UTC",
  businessDays: [1, 2, 3, 4, 5],
  afterHoursMessage:
    "Thank you for calling. We are currently closed. Please call back during business hours.",
};

function isVoiceProviderConfigured(
  provider: VoiceProvider,
  twilioConnected: boolean,
): boolean {
  if (provider === "twilio") {
    return twilioConnected || hasTwilioPlatformEnv();
  }

  if (provider === "retell") {
    return Boolean(process.env[ENV_KEYS.RETELL_API_KEY]?.trim());
  }

  if (provider === "vapi") {
    return Boolean(process.env[ENV_KEYS.VAPI_API_KEY]?.trim());
  }

  return false;
}

function buildWebhookUrls(businessId: string) {
  return {
    inboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
    outboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
  };
}

function mapConfigRowToSettings(
  businessId: string,
  data: NonNullable<
    Awaited<ReturnType<ReturnType<typeof getVoiceRepository>["findConfigByBusinessId"]>>
  >,
  twilioConnected: boolean,
): VoiceAgentSettings {
  const webhooks = buildWebhookUrls(businessId);
  const provider = data.provider as VoiceProvider;

  return {
    enabled: data.enabled,
    provider,
    phoneNumber: data.phone_number ?? "",
    outboundEnabled: data.outbound_enabled,
    inboundEnabled: data.inbound_enabled,
    callbackAfterOrder: data.callback_after_order,
    callbackDelayMinutes: data.callback_delay_minutes,
    outboundScript: data.outbound_script,
    inboundGreeting: data.inbound_greeting,
    retellAgentId: data.retell_agent_id ?? "",
    vapiAssistantId: data.vapi_assistant_id ?? "",
    twilioPhoneSid: data.twilio_phone_sid ?? "",
    aiEnabled: data.ai_enabled ?? true,
    voiceLanguage: data.voice_language ?? "English",
    voiceSystemPrompt: data.voice_system_prompt ?? "",
    recordingEnabled: data.recording_enabled ?? true,
    smsEnabled: data.sms_enabled ?? true,
    businessHoursEnabled: data.business_hours_enabled ?? false,
    businessHoursStart: data.business_hours_start ?? "09:00",
    businessHoursEnd: data.business_hours_end ?? "18:00",
    businessTimezone: data.business_timezone ?? "UTC",
    businessDays: data.business_days ?? [1, 2, 3, 4, 5],
    afterHoursMessage:
      data.after_hours_message ??
      "Thank you for calling. We are currently closed. Please call back during business hours.",
    providerConfigured: isVoiceProviderConfigured(provider, twilioConnected),
    aiConfigured: isVoiceAiConfigured(),
    ...webhooks,
  };
}

export async function getVoiceAgentSettings(
  businessId: string,
): Promise<VoiceAgentSettings> {
  const webhooks = buildWebhookUrls(businessId);
  const twilioConnection = hasSupabaseEnv()
    ? await getTwilioConnection(businessId)
    : null;
  const twilioConnected = twilioConnection?.status === "connected";

  if (!hasSupabaseEnv()) {
    return {
      ...DEFAULT_SETTINGS,
      providerConfigured: isVoiceProviderConfigured(
        DEFAULT_SETTINGS.provider,
        false,
      ),
      aiConfigured: isVoiceAiConfigured(),
      ...webhooks,
    };
  }

  const data = await getVoiceRepository().findConfigByBusinessId(businessId);

  if (!data) {
    return {
      ...DEFAULT_SETTINGS,
      providerConfigured: isVoiceProviderConfigured(
        DEFAULT_SETTINGS.provider,
        twilioConnected,
      ),
      aiConfigured: isVoiceAiConfigured(),
      ...webhooks,
    };
  }

  return mapConfigRowToSettings(businessId, data, twilioConnected);
}
