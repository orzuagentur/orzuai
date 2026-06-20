import "server-only";

import {
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { buildVoiceSystemPrompt } from "@/lib/voice/prompts";
import {
  buildGatherActionUrl,
  buildGoodbyeTwiml,
  buildSayAndGatherTwiml,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
  sanitizeForSpeech,
} from "@/lib/voice/twiml";
import { getDefaultGeminiModel, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText, getProviderAvailability } from "@/services/llm.service";
import { listKnowledgeEntriesForBusiness } from "@/services/messaging.service";
import type { VoiceAgentSettings } from "@/types/voice-agent.types";

const MAX_VOICE_TURNS = 8;

type VoiceTurn = {
  role: "user" | "assistant";
  content: string;
};

type VoiceSessionRow = {
  id: string;
  business_id: string;
  call_sid: string;
  direction: string;
  turns: VoiceTurn[];
  turn_count: number;
};

async function loadVoiceAgentConfig(
  businessId: string,
): Promise<VoiceAgentSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("voice_agent_config")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return {
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
      providerConfigured: false,
      aiConfigured: isVoiceAiConfigured(),
      inboundWebhookUrl: "",
      outboundWebhookUrl: "",
    };
  }

  return {
    enabled: data.enabled,
    provider: data.provider as VoiceAgentSettings["provider"],
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
    providerConfigured: true,
    aiConfigured: isVoiceAiConfigured(),
    inboundWebhookUrl: "",
    outboundWebhookUrl: "",
  };
}

async function loadBusinessContext(businessId: string) {
  const admin = createAdminClient();

  const [businessResult, aiSettingsResult, knowledgeEntries] =
    await Promise.all([
      admin
        .from("businesses")
        .select("business_name")
        .eq("id", businessId)
        .maybeSingle(),
      admin
        .from("ai_settings")
        .select("provider, model, language, system_prompt, channel")
        .eq("business_id", businessId)
        .in("channel", ["website_forms", "whatsapp", "telegram"])
        .order("channel", { ascending: true })
        .limit(1)
        .maybeSingle(),
      listKnowledgeEntriesForBusiness(admin, businessId),
    ]);

  return {
    businessName: businessResult.data?.business_name ?? "the business",
    provider: aiSettingsResult.data?.provider ?? "gemini",
    model: aiSettingsResult.data?.model ?? getDefaultGeminiModel(),
    language: aiSettingsResult.data?.language ?? DEFAULT_AI_LANGUAGE,
    systemPrompt:
      aiSettingsResult.data?.system_prompt ?? DEFAULT_AI_SYSTEM_PROMPT,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      category: entry.category ?? "",
      title: entry.title,
      content: entry.content,
    })),
  };
}

async function getOrCreateSession(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
}): Promise<VoiceSessionRow | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("voice_call_sessions")
    .select("id, business_id, call_sid, direction, turns, turn_count")
    .eq("call_sid", input.callSid)
    .maybeSingle();

  if (existing) {
    return {
      ...existing,
      turns: (existing.turns as VoiceTurn[]) ?? [],
    };
  }

  const { data: created, error } = await admin
    .from("voice_call_sessions")
    .insert({
      business_id: input.businessId,
      call_sid: input.callSid,
      direction: input.direction,
      turns: [],
      turn_count: 0,
    })
    .select("id, business_id, call_sid, direction, turns, turn_count")
    .single();

  if (error || !created) {
    return null;
  }

  return {
    ...created,
    turns: [],
  };
}

async function appendSessionTurn(input: {
  sessionId: string;
  turns: VoiceTurn[];
  turnCount: number;
}) {
  const admin = createAdminClient();

  await admin
    .from("voice_call_sessions")
    .update({
      turns: input.turns,
      turn_count: input.turnCount,
    })
    .eq("id", input.sessionId);
}

export async function generateVoiceAiReply(input: {
  businessId: string;
  userMessage: string;
  conversationHistory: VoiceTurn[];
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
  settings: VoiceAgentSettings;
}): Promise<{ success: true; text: string } | { success: false; message: string }> {
  const context = await loadBusinessContext(input.businessId);
  const language = input.settings.voiceLanguage || context.language;

  const systemPrompt = buildVoiceSystemPrompt({
    businessName: context.businessName,
    systemPrompt: context.systemPrompt,
    language,
    knowledgeContext: context.knowledgeContext,
    customVoicePrompt: input.settings.voiceSystemPrompt,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  const historyLines = input.conversationHistory.map((turn) =>
    turn.role === "user"
      ? `Customer: ${turn.content}`
      : `Assistant: ${turn.content}`,
  );
  historyLines.push(`Customer: ${input.userMessage}`);
  historyLines.push("Assistant:");

  const result = await generateText({
    businessId: input.businessId,
    provider: context.provider as "gemini" | "openai" | "claude",
    model: context.model,
    systemInstruction: systemPrompt,
    prompt: historyLines.join("\n"),
  });

  if (!result.success) {
    return {
      success: false,
      message: result.error.message,
    };
  }

  return {
    success: true,
    text: sanitizeForSpeech(result.data.text),
  };
}

function resolveOpeningLine(settings: VoiceAgentSettings, direction: "inbound" | "outbound") {
  return direction === "inbound"
    ? settings.inboundGreeting
    : settings.outboundScript;
}

export async function buildVoiceConversationTwiml(input: {
  businessId: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
}): Promise<string> {
  const settings = await loadVoiceAgentConfig(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);
  const opening = resolveOpeningLine(settings, input.direction);

  if (!settings.aiEnabled) {
    return buildStaticSayTwiml({ speech: opening, speechLocale });
  }

  const gatherUrl = buildGatherActionUrl({
    businessId: input.businessId,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  return buildSayAndGatherTwiml({
    speech: opening,
    gatherActionUrl: gatherUrl,
    speechLocale,
    reprompt:
      input.direction === "outbound"
        ? "Please tell me if you have any questions about your request."
        : "How can I help you today?",
  });
}

export function isVoiceAiConfigured(): boolean {
  const availability = getProviderAvailability();
  return availability.gemini || availability.openai || availability.claude;
}

export async function handleVoiceGatherInput(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  speechResult: string;
  triggerReason?: string | null;
}): Promise<string> {
  const settings = await loadVoiceAgentConfig(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  if (!settings.aiEnabled) {
    return buildGoodbyeTwiml(speechLocale);
  }

  const session = await getOrCreateSession({
    businessId: input.businessId,
    callSid: input.callSid,
    direction: input.direction,
  });

  if (!session) {
    return buildStaticSayTwiml({
      speech: "Sorry, something went wrong. Please try again later.",
      speechLocale,
    });
  }

  const userSpeech = input.speechResult.trim();

  if (!userSpeech) {
    const gatherUrl = buildGatherActionUrl({
      businessId: input.businessId,
      direction: input.direction,
      triggerReason: input.triggerReason,
    });

    return buildSayAndGatherTwiml({
      speech: "I did not hear you. Could you please repeat that?",
      gatherActionUrl: gatherUrl,
      speechLocale,
    });
  }

  if (session.turn_count >= MAX_VOICE_TURNS) {
    return buildGoodbyeTwiml(speechLocale);
  }

  const reply = await generateVoiceAiReply({
    businessId: input.businessId,
    userMessage: userSpeech,
    conversationHistory: session.turns,
    direction: input.direction,
    triggerReason: input.triggerReason,
    settings,
  });

  const assistantText = reply.success
    ? reply.text
    : "Sorry, I could not process that right now. A team member will follow up with you soon.";

  const updatedTurns: VoiceTurn[] = [
    ...session.turns,
    { role: "user", content: userSpeech },
    { role: "assistant", content: assistantText },
  ];

  await appendSessionTurn({
    sessionId: session.id,
    turns: updatedTurns,
    turnCount: session.turn_count + 1,
  });

  if (session.turn_count + 1 >= MAX_VOICE_TURNS) {
    return buildStaticSayTwiml({
      speech: `${assistantText} Thank you for calling. Goodbye.`,
      speechLocale,
    });
  }

  const gatherUrl = buildGatherActionUrl({
    businessId: input.businessId,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  return buildSayAndGatherTwiml({
    speech: assistantText,
    gatherActionUrl: gatherUrl,
    speechLocale,
  });
}
