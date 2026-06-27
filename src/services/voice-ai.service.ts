import "server-only";

import { buildVoiceSystemPrompt } from "@/lib/voice/prompts";
import {
  buildGatherActionUrl,
  buildGoodbyeTwiml,
  buildSayAndGatherTwiml,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
  sanitizeForSpeech,
} from "@/lib/voice/twiml";
import { hasSupabaseEnv } from "@/lib/env";
import { getVoiceAiBusinessContext } from "@/repositories/business-context.repository";
import {
  getVoiceRepository,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";
import { generateText } from "@/services/llm.service";
import { listKnowledgeEntriesForBusiness } from "@/services/messaging.service";
import { scheduleVoiceTurnOrchestration } from "@/services/voice-orchestrator.service";
import { markVoiceCallCompleted } from "@/services/voice-inbox.service";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import type { VoiceAgentSettings } from "@/types/voice-agent.types";

const MAX_VOICE_TURNS = 8;

type VoiceSessionState = {
  id: string;
  business_id: string;
  call_sid: string;
  direction: string;
  turns: VoiceCallSessionTurn[];
  turn_count: number;
};

async function loadBusinessContext(businessId: string) {
  const [context, knowledgeEntries] = await Promise.all([
    getVoiceAiBusinessContext(businessId),
    listKnowledgeEntriesForBusiness(
      getVoiceRepository().client,
      businessId,
    ),
  ]);

  return {
    businessName: context.businessName,
    provider: context.provider,
    model: context.model,
    language: context.language,
    systemPrompt: context.systemPrompt,
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
}): Promise<VoiceSessionState | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

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
    turns: [],
  };
}

async function appendSessionTurn(input: {
  sessionId: string;
  turns: VoiceCallSessionTurn[];
  turnCount: number;
}) {
  await getVoiceRepository().updateSessionTurns({
    sessionId: input.sessionId,
    turns: input.turns,
    turnCount: input.turnCount,
  });
}

export async function generateVoiceAiReply(input: {
  businessId: string;
  userMessage: string;
  conversationHistory: VoiceCallSessionTurn[];
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
  const settings = await getVoiceAgentSettings(input.businessId);
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

export async function handleVoiceGatherInput(input: {
  businessId: string;
  callSid: string;
  direction: "inbound" | "outbound";
  speechResult: string;
  triggerReason?: string | null;
  callerPhone?: string | null;
}): Promise<string> {
  const settings = await getVoiceAgentSettings(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(settings.voiceLanguage);

  if (!settings.aiEnabled) {
    void markVoiceCallCompleted({ callSid: input.callSid, aiHandled: false });
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
    void markVoiceCallCompleted({ callSid: input.callSid, aiHandled: true });
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

  const updatedTurns: VoiceCallSessionTurn[] = [
    ...session.turns,
    { role: "user", content: userSpeech },
    { role: "assistant", content: assistantText },
  ];

  await appendSessionTurn({
    sessionId: session.id,
    turns: updatedTurns,
    turnCount: session.turn_count + 1,
  });

  if (input.callerPhone?.trim()) {
    void scheduleVoiceTurnOrchestration({
      businessId: input.businessId,
      callerPhone: input.callerPhone.trim(),
      clientMessage: userSpeech,
      conversationHistory: updatedTurns,
    });
  }

  if (session.turn_count + 1 >= MAX_VOICE_TURNS) {
    void markVoiceCallCompleted({ callSid: input.callSid, aiHandled: true });
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
