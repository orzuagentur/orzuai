import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import {
  getVoicePhonePrompts,
  resolveDeepgramLanguageCode,
} from "@/lib/voice/language";
import {
  getVoiceRepository,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import {
  generateVoiceAiReply,
} from "@/services/voice-ai.service";
import {
  markInboundCallAiFallback,
  markVoiceCallCompleted,
} from "@/services/voice-inbox.service";
import {
  loadPhoneVoiceSettings,
} from "@/services/voice-phone-tts.service";
import { getVoiceAiBusinessContext } from "@/repositories/business-context.repository";

const MAX_STREAM_TURNS = 24;

function resolveOpeningLine(
  settings: Awaited<ReturnType<typeof getVoiceAgentSettings>>,
  direction: "inbound" | "outbound",
) {
  return direction === "inbound"
    ? settings.inboundGreeting
    : settings.outboundScript;
}

async function getOrCreateStreamSession(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
}) {
  const repo = getVoiceRepository();
  const existing = await repo.findSessionByCallSid(input.callSid);

  if (existing) {
    return {
      ...existing,
      turns: (existing.turns as VoiceCallSessionTurn[]) ?? [],
    };
  }

  const created = await repo.createSession({
    businessId: input.businessId,
    callSid: input.callSid,
    direction: input.direction,
  });

  if (!created) {
    return null;
  }

  return {
    ...created,
    turns: [] as VoiceCallSessionTurn[],
  };
}

export async function getVoiceStreamSessionContext(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
}) {
  const [settings, phoneVoice, businessContext] = await Promise.all([
    getVoiceAgentSettings(input.businessId),
    loadPhoneVoiceSettings(input.businessId),
    getVoiceAiBusinessContext(input.businessId),
  ]);

  if (!phoneVoice.voiceId) {
    throw new Error("ElevenLabs voice is not configured.");
  }

  return {
    businessId: input.businessId,
    businessName: businessContext.businessName,
    language: phoneVoice.language,
    languageCode: phoneVoice.languageCode,
    voiceId: phoneVoice.voiceId,
    openingLine: resolveOpeningLine(settings, input.direction),
    direction: input.direction,
    triggerReason: input.triggerReason ?? null,
    deepgramLanguage: resolveDeepgramLanguageCode(phoneVoice.language),
  };
}

export async function generateVoiceStreamReply(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  userMessage: string;
  triggerReason?: string | null;
}): Promise<{ text: string; endCall?: boolean }> {
  const settings = await getVoiceAgentSettings(input.businessId);
  const prompts = getVoicePhonePrompts(
    (await loadPhoneVoiceSettings(input.businessId)).language,
  );
  const session = await getOrCreateStreamSession({
    businessId: input.businessId,
    callSid: input.callSid,
    direction: input.direction,
  });

  if (!session) {
    return { text: prompts.error, endCall: true };
  }

  if (session.turn_count >= MAX_STREAM_TURNS) {
    return { text: prompts.goodbye, endCall: true };
  }

  const reply = await generateVoiceAiReply({
    businessId: input.businessId,
    userMessage: input.userMessage,
    conversationHistory: session.turns,
    direction: input.direction,
    triggerReason: input.triggerReason,
    settings,
  });

  const assistantText = reply.success
    ? reply.text
    : "Sorry, I could not process that right now.";

  const updatedTurns: VoiceCallSessionTurn[] = [
    ...session.turns,
    { role: "user", content: input.userMessage.trim() },
    { role: "assistant", content: assistantText },
  ];

  await getVoiceRepository().updateSessionTurns({
    sessionId: session.id,
    turns: updatedTurns,
    turnCount: session.turn_count + 1,
  });

  return {
    text: assistantText,
    endCall: session.turn_count + 1 >= MAX_STREAM_TURNS,
  };
}

export async function appendVoiceStreamSessionTurn(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const session = await getOrCreateStreamSession({
    businessId: input.businessId,
    callSid: input.callSid,
    direction: input.direction,
  });

  if (!session) {
    return;
  }

  const turns: VoiceCallSessionTurn[] = [
    ...session.turns,
    { role: input.role, content: input.content.trim() },
  ];

  await getVoiceRepository().updateSessionTurns({
    sessionId: session.id,
    turns,
    turnCount: Math.max(session.turn_count, Math.ceil(turns.length / 2)),
  });
}

export async function handleVoiceStreamLifecycle(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  event: "start" | "stop";
  triggerReason?: string | null;
}): Promise<void> {
  if (!hasSupabaseEnv() || !input.callSid.trim()) {
    return;
  }

  const repo = getVoiceRepository();
  const existing = await repo.findCallLogByExternalCallId(input.callSid);

  if (input.event === "start") {
    if (existing) {
      await repo.updateCallLog(existing.id, {
        status: "active",
        callMode: "ai",
        aiHandled: true,
      });
      return;
    }

    await repo.insertCallLog({
      businessId: input.businessId,
      direction: input.direction,
      phoneNumber: "stream",
      status: "active",
      provider: "twilio",
      externalCallId: input.callSid,
      triggerReason: input.triggerReason ?? "ai_stream",
      callMode: "ai",
      aiHandled: true,
    });
    return;
  }

  if (input.direction === "inbound" && existing?.call_mode === "human") {
    await markInboundCallAiFallback(input.businessId, input.callSid);
  }

  await markVoiceCallCompleted({
    callSid: input.callSid,
    aiHandled: true,
  });
}
