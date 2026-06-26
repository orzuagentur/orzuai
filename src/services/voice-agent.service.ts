import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ENV_KEYS } from "@/constants/env-keys";
import {
  getTwilioConnection,
  getTwilioConnectConfig as getPlatformTwilioConnectConfig,
  resolveTwilioCredentialsForBusiness,
} from "@/services/twilio-integration.service";
import {
  createTwilioOutboundCall,
} from "@/lib/twilio/client";
import { hasTwilioPlatformEnv } from "@/lib/twilio/connect";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  buildVoiceConversationTwiml,
  isVoiceAiConfigured,
} from "@/services/voice-ai.service";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  ConnectVoiceAgentInput,
  SaveVoiceAgentSettingsInput,
  VoiceAgentSettings,
  VoiceCallLogItem,
  VoiceConnectConfig,
  VoiceConnectionData,
  VoiceProvider,
} from "@/types/voice-agent.types";
import {
  saveVoiceAgentSettingsSchema,
} from "@/types/voice-agent.types";

type MessagingDbClient = ReturnType<typeof createAdminClient>;

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

function revalidateVoicePaths(): void {
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/voice`);
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

export function getVoiceConnectConfig(): VoiceConnectConfig {
  const twilioConfig = getPlatformTwilioConnectConfig();

  return {
    isConfigured: twilioConfig.isConfigured,
    aiConfigured: isVoiceAiConfigured(),
    connectUrl: twilioConfig.connectUrl,
    authorizeRedirectUri: twilioConfig.authorizeRedirectUri,
    deauthorizeRedirectUri: twilioConfig.deauthorizeRedirectUri,
  };
}

export async function getVoiceConnection(
  businessId: string,
): Promise<VoiceConnectionData> {
  const [settings, twilio] = await Promise.all([
    getVoiceAgentSettings(businessId),
    getTwilioConnection(businessId),
  ]);

  const base = {
    callbackAfterOrder: settings.callbackAfterOrder,
    connectedAt: twilio?.connectedAt ?? null,
    lastSyncedAt: twilio?.lastSyncedAt ?? null,
    accountFriendlyName: twilio?.accountFriendlyName ?? null,
    pendingPhoneSelection: twilio?.status === "authorized",
  };

  if (twilio?.status === "connected" && settings.phoneNumber) {
    return {
      status: "connected",
      phoneNumber: settings.phoneNumber,
      enabled: settings.enabled,
      ...base,
      pendingPhoneSelection: false,
    };
  }

  if (twilio?.status === "authorized") {
    return {
      status: "pending",
      phoneNumber: null,
      enabled: false,
      ...base,
      pendingPhoneSelection: true,
    };
  }

  if (!settings.phoneNumber) {
    return {
      status: "disconnected",
      phoneNumber: null,
      enabled: false,
      ...base,
      pendingPhoneSelection: false,
    };
  }

  if (
    settings.enabled &&
    settings.phoneNumber &&
    settings.providerConfigured
  ) {
    return {
      status: "connected",
      phoneNumber: settings.phoneNumber,
      enabled: true,
      ...base,
      pendingPhoneSelection: false,
    };
  }

  return {
    status: "pending",
    phoneNumber: settings.phoneNumber,
    enabled: settings.enabled,
    ...base,
    pendingPhoneSelection: false,
  };
}

export async function connectVoiceAgent(
  businessId: string,
  input: ConnectVoiceAgentInput,
): Promise<{ success: boolean; message?: string }> {
  void businessId;
  void input;
  return {
    success: false,
    message:
      "Подключите Twilio через кнопку «Подключить Twilio» в разделе Интеграции.",
  };
}

export async function disconnectVoiceAgent(
  businessId: string,
): Promise<{ success: boolean; message?: string }> {
  const { disconnectTwilioIntegration } = await import(
    "@/services/twilio-integration.service"
  );
  return disconnectTwilioIntegration(businessId);
}

function buildWebhookUrls(businessId: string) {
  return {
    inboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
    outboundWebhookUrl: `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
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

  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_agent_config")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

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
    providerConfigured: isVoiceProviderConfigured(provider, twilioConnected),
    aiConfigured: isVoiceAiConfigured(),
    ...webhooks,
  };
}

export async function saveVoiceAgentSettings(
  businessId: string,
  input: SaveVoiceAgentSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveVoiceAgentSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? VOICE_MESSAGES.saveFailed,
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("voice_agent_config").upsert(
    {
      business_id: businessId,
      enabled: parsed.data.enabled,
      provider: parsed.data.provider,
      phone_number: parsed.data.phoneNumber || null,
      outbound_enabled: parsed.data.outboundEnabled,
      inbound_enabled: parsed.data.inboundEnabled,
      callback_after_order: parsed.data.callbackAfterOrder,
      callback_delay_minutes: parsed.data.callbackDelayMinutes,
      outbound_script: parsed.data.outboundScript,
      inbound_greeting: parsed.data.inboundGreeting,
      retell_agent_id: parsed.data.retellAgentId || null,
      vapi_assistant_id: parsed.data.vapiAssistantId || null,
      twilio_phone_sid: parsed.data.twilioPhoneSid || null,
      ai_enabled: parsed.data.aiEnabled ?? true,
      voice_language: parsed.data.voiceLanguage ?? "English",
      voice_system_prompt: parsed.data.voiceSystemPrompt || null,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateVoicePaths();

  return { success: true };
}

export async function listRecentVoiceCalls(
  businessId: string,
): Promise<VoiceCallLogItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_call_logs")
    .select(
      "id, direction, phone_number, status, provider, trigger_reason, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    data?.map((row) => ({
      id: row.id,
      direction: row.direction as "outbound" | "inbound",
      phoneNumber: row.phone_number,
      status: row.status,
      provider: row.provider,
      triggerReason: row.trigger_reason,
      createdAt: row.created_at,
    })) ?? []
  );
}

async function logVoiceCall(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId?: string | null;
  direction: "outbound" | "inbound";
  phoneNumber: string;
  status: string;
  provider: VoiceProvider;
  externalCallId?: string | null;
  triggerReason?: string | null;
}) {
  await input.admin.from("voice_call_logs").insert({
    business_id: input.businessId,
    contact_id: input.contactId ?? null,
    direction: input.direction,
    phone_number: input.phoneNumber,
    status: input.status,
    provider: input.provider,
    external_call_id: input.externalCallId ?? null,
    trigger_reason: input.triggerReason ?? null,
  });
}

async function twilioCreateCall(input: {
  credentials: { accountSid: string; authToken: string };
  from: string;
  to: string;
  twimlUrl: string;
}): Promise<{ success: true; callSid: string } | { success: false; message: string }> {
  try {
    const callSid = await createTwilioOutboundCall({
      credentials: input.credentials,
      from: input.from,
      to: input.to,
      twimlUrl: input.twimlUrl,
    });
    return { success: true, callSid };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "Twilio call failed.",
    };
  }
}

async function retellCreateCall(input: {
  agentId: string;
  toNumber: string;
  fromNumber: string;
}): Promise<{ success: true; callId: string } | { success: false; message: string }> {
  const apiKey = process.env[ENV_KEYS.RETELL_API_KEY]?.trim();

  if (!apiKey) {
    return { success: false, message: "RETELL_API_KEY missing." };
  }

  const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from_number: input.fromNumber,
      to_number: input.toNumber,
      override_agent_id: input.agentId,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      message: body.slice(0, 300) || `Retell error (${response.status}).`,
    };
  }

  const payload = (await response.json()) as { call_id?: string };
  return { success: true, callId: payload.call_id ?? "unknown" };
}

async function vapiCreateCall(input: {
  assistantId: string;
  customerNumber: string;
  phoneNumberId?: string;
}): Promise<{ success: true; callId: string } | { success: false; message: string }> {
  const apiKey = process.env[ENV_KEYS.VAPI_API_KEY]?.trim();

  if (!apiKey) {
    return { success: false, message: "VAPI_API_KEY missing." };
  }

  const response = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId: input.assistantId,
      customer: { number: input.customerNumber },
      phoneNumberId: input.phoneNumberId || undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      message: body.slice(0, 300) || `Vapi error (${response.status}).`,
    };
  }

  const payload = (await response.json()) as { id?: string };
  return { success: true, callId: payload.id ?? "unknown" };
}

export async function placeOutboundVoiceCall(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId?: string | null;
  phoneNumber: string;
  triggerReason: string;
}): Promise<{ success: boolean; message?: string }> {
  const settings = await getVoiceAgentSettings(input.businessId);

  if (!settings.enabled || !settings.outboundEnabled) {
    return { success: false, message: "Outbound voice agent is disabled." };
  }

  if (!settings.phoneNumber) {
    return { success: false, message: "Configure a business phone number first." };
  }

  const twilioConnection = await getTwilioConnection(input.businessId);
  const twilioCredentials = resolveTwilioCredentialsForBusiness(twilioConnection);

  if (
    settings.provider === "twilio" &&
    !twilioCredentials &&
    !hasTwilioPlatformEnv()
  ) {
    return { success: false, message: VOICE_MESSAGES.platformMissing };
  }

  if (!isVoiceProviderConfigured(settings.provider, Boolean(twilioCredentials))) {
    return { success: false, message: VOICE_MESSAGES.platformMissing };
  }

  const webhooks = buildWebhookUrls(input.businessId);
  let externalCallId: string | null = null;
  let status = "queued";

  if (settings.provider === "twilio") {
    if (!twilioCredentials) {
      return { success: false, message: VOICE_MESSAGES.platformMissing };
    }

    const outboundUrl = new URL(webhooks.outboundWebhookUrl);
    outboundUrl.searchParams.set("triggerReason", input.triggerReason);

    const result = await twilioCreateCall({
      credentials: twilioCredentials,
      from: settings.phoneNumber,
      to: input.phoneNumber,
      twimlUrl: outboundUrl.toString(),
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    externalCallId = result.callSid;
    status = "initiated";
  } else if (settings.provider === "retell") {
    if (!settings.retellAgentId) {
      return { success: false, message: "Retell agent ID is required." };
    }

    const result = await retellCreateCall({
      agentId: settings.retellAgentId,
      toNumber: input.phoneNumber,
      fromNumber: settings.phoneNumber,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    externalCallId = result.callId;
    status = "initiated";
  } else if (settings.provider === "vapi") {
    if (!settings.vapiAssistantId) {
      return { success: false, message: "Vapi assistant ID is required." };
    }

    const result = await vapiCreateCall({
      assistantId: settings.vapiAssistantId,
      customerNumber: input.phoneNumber,
      phoneNumberId: settings.twilioPhoneSid || undefined,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    externalCallId = result.callId;
    status = "initiated";
  }

  await logVoiceCall({
    admin: input.admin,
    businessId: input.businessId,
    contactId: input.contactId,
    direction: "outbound",
    phoneNumber: input.phoneNumber,
    status,
    provider: settings.provider,
    externalCallId,
    triggerReason: input.triggerReason,
  });

  return { success: true };
}

export async function scheduleOutboundCallAfterOrder(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  phoneNumber: string;
}): Promise<void> {
  const settings = await getVoiceAgentSettings(input.businessId);

  if (
    !settings.enabled ||
    !settings.outboundEnabled ||
    !settings.callbackAfterOrder
  ) {
    return;
  }

  const executeAt = new Date(
    Date.now() + settings.callbackDelayMinutes * 60 * 1000,
  ).toISOString();

  if (settings.callbackDelayMinutes <= 0) {
    await placeOutboundVoiceCall({
      admin: input.admin,
      businessId: input.businessId,
      contactId: input.contactId,
      phoneNumber: input.phoneNumber,
      triggerReason: "order_callback",
    });
    return;
  }

  await input.admin.from("voice_call_queue").insert({
    business_id: input.businessId,
    contact_id: input.contactId,
    phone_number: input.phoneNumber,
    trigger_reason: "order_callback",
    execute_at: executeAt,
    status: "pending",
  });
}

export async function processVoiceCallQueue(): Promise<{
  processed: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("voice_call_queue")
    .select("id, business_id, contact_id, phone_number, trigger_reason")
    .eq("status", "pending")
    .lte("execute_at", now)
    .limit(20);

  let processed = 0;

  for (const item of pending ?? []) {
    const result = await placeOutboundVoiceCall({
      admin,
      businessId: item.business_id,
      contactId: item.contact_id,
      phoneNumber: item.phone_number,
      triggerReason: item.trigger_reason,
    });

    await admin
      .from("voice_call_queue")
      .update({ status: result.success ? "completed" : "failed" })
      .eq("id", item.id);

    if (result.success) {
      processed += 1;
    }
  }

  return { processed };
}

export async function getVoiceAgentSettingsForUser(): Promise<{
  settings: VoiceAgentSettings;
  recentCalls: VoiceCallLogItem[];
} | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return null;
  }

  const [settings, recentCalls] = await Promise.all([
    getVoiceAgentSettings(business.id),
    listRecentVoiceCalls(business.id),
  ]);

  return { settings, recentCalls };
}

export async function getInboundVoiceTwiml(
  businessId: string,
): Promise<string> {
  const settings = await getVoiceAgentSettings(businessId);

  if (!settings.inboundEnabled) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">This line is currently unavailable. Please try again later.</Say></Response>`;
  }

  return buildVoiceConversationTwiml({
    businessId,
    direction: "inbound",
  });
}

export async function getOutboundVoiceTwiml(
  businessId: string,
  triggerReason?: string | null,
): Promise<string> {
  return buildVoiceConversationTwiml({
    businessId,
    direction: "outbound",
    triggerReason,
  });
}

export async function setVoiceAiEnabled(
  businessId: string,
  aiEnabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("voice_agent_config")
    .update({ ai_enabled: aiEnabled })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateVoicePaths();
  return { success: true };
}
