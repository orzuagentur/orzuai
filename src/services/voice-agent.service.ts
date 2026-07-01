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
import { appendTwilioWebhookSignature } from "@/lib/twilio/webhook-token";
import { isVoiceAiConfigured } from "@/lib/voice/ai-config";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  buildVoiceConversationTwiml,
} from "@/services/voice-ai.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import { applyCallRecordingToTwiml } from "@/services/voice-recording.service";
import { isWithinBusinessHours } from "@/lib/voice/business-hours";
import { buildStaticSayTwiml, mapVoiceLanguageToTwilioLocale } from "@/lib/voice/twiml";
import { buildAppUrl } from "@/lib/app-url";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVoiceRepository } from "@/repositories/voice.repository";
import { resolveInboundMessageContext } from "@/services/inbound-ingest.service";
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

export { getVoiceAgentSettings } from "@/services/voice-config.service";

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
    phoneSid: twilio?.phoneSid ?? null,
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
      ...base,
      phoneNumber: null,
      phoneSid: null,
      enabled: false,
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
    inboundWebhookUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/inbound")}?businessId=${businessId}`,
      businessId,
    ),
    outboundWebhookUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/outbound")}?businessId=${businessId}`,
      businessId,
    ),
    statusCallbackUrl: appendTwilioWebhookSignature(
      `${buildAppUrl("/api/webhooks/voice/status")}?businessId=${businessId}`,
      businessId,
    ),
  };
}

export async function recordInboundVoiceCall(input: {
  businessId: string;
  phoneNumber: string;
  callSid: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const phoneNumber = input.phoneNumber.trim();
  const callMode = "human";
  let contactId: string | null = null;
  let conversationId: string | null = null;

  if (phoneNumber) {
    const context = await resolveInboundMessageContext(createAdminClient(), {
      businessId: input.businessId,
      channel: "voice",
      contactName: phoneNumber,
      contactPhone: phoneNumber,
      identifier: phoneNumber,
      displayLabel: phoneNumber,
    });

    contactId = context?.contactId ?? null;
    conversationId = context?.conversationId ?? null;
  }

  const repo = getVoiceRepository();

  const callLogId = await repo.insertCallLog({
    businessId: input.businessId,
    contactId,
    conversationId,
    callMode,
    direction: "inbound",
    phoneNumber: phoneNumber || "unknown",
    status: "ringing",
    provider: "twilio",
    externalCallId: input.callSid || null,
    triggerReason: "inbound_call",
    aiHandled: false,
    humanHandled: true,
  });

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId,
    callSid: input.callSid || null,
    eventType: "call.created",
    actorType: "twilio",
    payload: {
      direction: "inbound",
      phoneNumber: phoneNumber || "unknown",
      callMode,
    },
  });
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

  const { error } = await getVoiceRepository().upsertConfig(businessId, parsed.data);

  if (error) {
    return { success: false, message: error };
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

  const rows = await getVoiceRepository().listRecentCallLogs(businessId);

  return rows.map((row) => ({
      id: row.id,
      direction: row.direction as "outbound" | "inbound",
      phoneNumber: row.phone_number,
      status: row.status,
      provider: row.provider,
      triggerReason: row.trigger_reason,
      createdAt: row.created_at,
    }));
}

async function logVoiceCall(input: {
  businessId: string;
  contactId?: string | null;
  direction: "outbound" | "inbound";
  phoneNumber: string;
  status: string;
  provider: VoiceProvider;
  externalCallId?: string | null;
  triggerReason?: string | null;
  callMode?: "ai" | "human" | "handoff" | "unknown";
  customPrompt?: string | null;
}): Promise<string | null> {
  const repo = getVoiceRepository();

  const callLogId = await repo.insertCallLog({
    businessId: input.businessId,
    contactId: input.contactId,
    callMode: input.callMode,
    direction: input.direction,
    phoneNumber: input.phoneNumber,
    status: input.status,
    provider: input.provider,
    externalCallId: input.externalCallId,
    triggerReason: input.triggerReason,
    aiHandled: input.callMode === "ai",
    humanHandled: input.callMode === "human",
    customPrompt: input.customPrompt,
  });

  await repo.insertCallEvent({
    businessId: input.businessId,
    callLogId,
    callSid: input.externalCallId ?? null,
    eventType: "call.created",
    actorType: input.callMode === "ai" ? "ai" : "system",
    payload: {
      direction: input.direction,
      phoneNumber: input.phoneNumber,
      status: input.status,
      provider: input.provider,
      triggerReason: input.triggerReason ?? null,
      callMode: input.callMode ?? "unknown",
    },
  });

  return callLogId;
}

async function twilioCreateCall(input: {
  credentials: { accountSid: string; authToken: string };
  from: string;
  to: string;
  twimlUrl: string;
  statusCallbackUrl?: string;
}): Promise<{ success: true; callSid: string } | { success: false; message: string }> {
  try {
    const callSid = await createTwilioOutboundCall({
      credentials: input.credentials,
      from: input.from,
      to: input.to,
      twimlUrl: input.twimlUrl,
      statusCallbackUrl: input.statusCallbackUrl,
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
  businessId: string;
  contactId?: string | null;
  phoneNumber: string;
  triggerReason: string;
  requireAiAssistant?: boolean;
  customPrompt?: string | null;
}): Promise<{ success: boolean; message?: string; callLogId?: string }> {
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

  if (!settings.providerConfigured) {
    return { success: false, message: VOICE_MESSAGES.platformMissing };
  }

  if (
    input.requireAiAssistant &&
    settings.provider === "twilio" &&
    (!settings.aiEnabled || !settings.aiConfigured)
  ) {
    return {
      success: false,
      message: VOICE_MESSAGES.callModeAiUnavailable,
    };
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

    if (input.requireAiAssistant) {
      outboundUrl.searchParams.set("callMode", "ai");
    }

    const result = await twilioCreateCall({
      credentials: twilioCredentials,
      from: settings.phoneNumber,
      to: input.phoneNumber,
      twimlUrl: outboundUrl.toString(),
      statusCallbackUrl: webhooks.statusCallbackUrl,
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

  const callLogId = await logVoiceCall({
    businessId: input.businessId,
    contactId: input.contactId,
    direction: "outbound",
    phoneNumber: input.phoneNumber,
    status,
    provider: settings.provider,
    externalCallId,
    triggerReason: input.triggerReason,
    callMode: input.requireAiAssistant ? "ai" : "unknown",
    customPrompt: input.customPrompt,
  });

  return { success: true, callLogId: callLogId ?? undefined };
}

export async function scheduleOutboundCallAfterOrder(input: {
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
      businessId: input.businessId,
      contactId: input.contactId,
      phoneNumber: input.phoneNumber,
      triggerReason: "order_callback",
    });
    return;
  }

  await getVoiceRepository().insertQueueItem({
    businessId: input.businessId,
    contactId: input.contactId,
    phoneNumber: input.phoneNumber,
    triggerReason: "order_callback",
    executeAt,
  });
}

export async function processVoiceCallQueue(): Promise<{
  processed: number;
}> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const repo = getVoiceRepository();
  const now = new Date().toISOString();
  const pending = await repo.claimPendingQueueItems(now);

  let processed = 0;

  for (const item of pending) {
    let result: { success: boolean; message?: string };

    try {
      result = await placeOutboundVoiceCall({
        businessId: item.business_id,
        contactId: item.contact_id,
        phoneNumber: item.phone_number,
        triggerReason: item.trigger_reason,
      });
    } catch (error) {
      console.error(
        "[voice-queue] outbound call failed",
        JSON.stringify({
          queueItemId: item.id,
          businessId: item.business_id,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
      result = { success: false };
    }

    await repo.updateQueueItemStatus(
      item.id,
      result.success ? "completed" : "failed",
    );

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
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  if (!settings.inboundEnabled) {
    return applyCallRecordingToTwiml(
      businessId,
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">This line is currently unavailable. Please try again later.</Say></Response>`,
    );
  }

  if (
    !isWithinBusinessHours({
      enabled: settings.businessHoursEnabled,
      start: settings.businessHoursStart,
      end: settings.businessHoursEnd,
      timezone: settings.businessTimezone,
      days: settings.businessDays,
    })
  ) {
    return applyCallRecordingToTwiml(
      businessId,
      buildStaticSayTwiml({
        speech: settings.afterHoursMessage,
        speechLocale,
      }),
    );
  }

  const { buildInboundBrowserTwiml } = await import(
    "@/services/voice-client.service"
  );
  const twiml = await buildInboundBrowserTwiml(businessId);

  return applyCallRecordingToTwiml(businessId, twiml);
}

export async function getOutboundVoiceTwiml(
  businessId: string,
  triggerReason?: string | null,
  callMode?: string | null,
  callSid?: string | null,
): Promise<string> {
  return buildVoiceConversationTwiml({
    businessId,
    direction: "outbound",
    triggerReason,
    forceAi: callMode === "ai",
    callSid,
  });
}

export async function setVoiceAiEnabled(
  businessId: string,
  aiEnabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const { error } = await getVoiceRepository().updateAiEnabled(
    businessId,
    aiEnabled,
  );

  if (error) {
    return { success: false, message: error };
  }

  revalidateVoicePaths();
  return { success: true };
}
