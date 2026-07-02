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
  generateVoiceAiReplyStream,
  generateVoiceOpeningLine,
  type VoiceAiStreamChunk,
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

function resolveStreamOpeningLine(input: {
  settings: Awaited<ReturnType<typeof getVoiceAgentSettings>>;
  direction: "inbound" | "outbound";
  language: string;
}) {
  const prompts = getVoicePhonePrompts(input.language);
  const configuredLine =
    input.direction === "inbound"
      ? input.settings.inboundGreeting?.trim()
      : input.settings.outboundScript?.trim();

  const defaultEnglishInbound =
    "Thank you for calling. How can we help you today?";
  const defaultEnglishOutbound =
    "Hello! This is your AI assistant calling to confirm your order and see if you have any questions.";

  if (
    configuredLine &&
    configuredLine !== defaultEnglishInbound &&
    configuredLine !== defaultEnglishOutbound
  ) {
    return configuredLine;
  }

  return input.direction === "inbound"
    ? prompts.inboundReprompt
    : prompts.outboundReprompt;
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
  const [settings, phoneVoice, businessContext, callLog] = await Promise.all([
    getVoiceAgentSettings(input.businessId),
    loadPhoneVoiceSettings(input.businessId),
    getVoiceAiBusinessContext(input.businessId),
    getVoiceRepository().findCallLogByExternalCallId(input.callSid),
  ]);

  if (!phoneVoice.voiceId) {
    throw new Error("ElevenLabs voice is not configured.");
  }

  const prompts = getVoicePhonePrompts(phoneVoice.language);
  const callObjective = callLog?.custom_prompt?.trim() || null;

  let openingLine = resolveStreamOpeningLine({
    settings,
    direction: input.direction,
    language: phoneVoice.language,
  });

  if (callObjective) {
    const generatedOpening = await generateVoiceOpeningLine({
      businessId: input.businessId,
      direction: input.direction,
      callObjective,
      settings,
      triggerReason: input.triggerReason,
    });

    if (generatedOpening) {
      openingLine = generatedOpening;
    }
  }

  return {
    businessId: input.businessId,
    businessName: businessContext.businessName,
    language: phoneVoice.language,
    languageCode: phoneVoice.languageCode,
    voiceId: phoneVoice.voiceId,
    openingLine,
    errorPrompt: prompts.error,
    repeatPrompt: prompts.repeat,
    direction: input.direction,
    triggerReason: input.triggerReason ?? null,
    deepgramLanguage: resolveDeepgramLanguageCode(phoneVoice.language),
    callObjective,
  };
}

export async function generateVoiceStreamReply(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  userMessage: string;
  triggerReason?: string | null;
}): Promise<{ text: string; endCall?: boolean }> {
  const [settings, phoneVoice, callLog, session] = await Promise.all([
    getVoiceAgentSettings(input.businessId),
    loadPhoneVoiceSettings(input.businessId),
    getVoiceRepository().findCallLogByExternalCallId(input.callSid),
    getOrCreateStreamSession({
      businessId: input.businessId,
      callSid: input.callSid,
      direction: input.direction,
    }),
  ]);
  const prompts = getVoicePhonePrompts(phoneVoice.language);

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
    callObjective: callLog?.custom_prompt,
  });

  if (!reply.success) {
    console.error(
      "[voice-stream] LLM reply failed",
      JSON.stringify({
        businessId: input.businessId,
        callSid: input.callSid,
        message: reply.message,
        hasCustomPrompt: Boolean(callLog?.custom_prompt?.trim()),
      }),
    );
  }

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

export type VoiceStreamReplyStreamEvent =
  | VoiceAiStreamChunk
  | { type: "done"; text: string; endCall?: boolean };

export async function* generateVoiceStreamReplyStream(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  userMessage: string;
  triggerReason?: string | null;
}): AsyncGenerator<VoiceStreamReplyStreamEvent, void, void> {
  const [settings, phoneVoice, callLog, session] = await Promise.all([
    getVoiceAgentSettings(input.businessId),
    loadPhoneVoiceSettings(input.businessId),
    getVoiceRepository().findCallLogByExternalCallId(input.callSid),
    getOrCreateStreamSession({
      businessId: input.businessId,
      callSid: input.callSid,
      direction: input.direction,
    }),
  ]);
  const prompts = getVoicePhonePrompts(phoneVoice.language);

  if (!session) {
    yield { type: "delta", text: prompts.error };
    yield { type: "done", text: prompts.error, endCall: true };
    return;
  }

  if (session.turn_count >= MAX_STREAM_TURNS) {
    yield { type: "delta", text: prompts.goodbye };
    yield { type: "done", text: prompts.goodbye, endCall: true };
    return;
  }

  let assistantText = "";

  try {
    for await (const chunk of generateVoiceAiReplyStream({
      businessId: input.businessId,
      userMessage: input.userMessage,
      conversationHistory: session.turns,
      direction: input.direction,
      triggerReason: input.triggerReason,
      settings,
      callObjective: callLog?.custom_prompt,
    })) {
      if (chunk.type === "delta") {
        yield chunk;
      } else {
        assistantText = chunk.text;
      }
    }
  } catch (error) {
    console.error(
      "[voice-stream] LLM stream failed",
      JSON.stringify({
        businessId: input.businessId,
        callSid: input.callSid,
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    assistantText = "Sorry, I could not process that right now.";
    yield { type: "delta", text: assistantText };
  }

  if (!assistantText.trim()) {
    assistantText = "Sorry, I could not process that right now.";
  }

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

  yield {
    type: "done",
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
