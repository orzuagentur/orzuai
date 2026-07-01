import "server-only";

import { buildVoiceSystemPrompt } from "@/lib/voice/prompts";
import { getVoicePhonePrompts } from "@/lib/voice/language";
import {
  buildGatherActionUrl,
  buildGoodbyeTwiml,
  buildPlayAndGatherTwiml,
  buildPlayTwiml,
  buildSayAndGatherTwiml,
  buildStaticSayTwiml,
  mapVoiceLanguageToTwilioLocale,
  sanitizeForSpeech,
} from "@/lib/voice/twiml";
import { isVoiceStreamEnabled, getVoiceStreamWsUrl } from "@/lib/voice/stream-config";
import { buildMediaStreamConnectTwiml } from "@/lib/voice/stream-twiml";
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
import {
  applyCallRecordingToTwiml,
  resolveRecordingCallbackUrl,
} from "@/services/voice-recording.service";
import {
  buildHandoffAgentTwiml,
  markVoiceCallHandoffByCallSid,
} from "@/services/voice-handoff.service";
import { hasTwilioVoiceClientEnv } from "@/lib/twilio/access-token";
import {
  customerConfirmedHumanHandoff,
  customerExplicitlyRequestedHuman,
} from "@/utils/human-handoff-policy";
import { getVoiceAgentSettings } from "@/services/voice-config.service";
import {
  loadPhoneVoiceSettings,
  synthesizePhoneSpeechAudio,
} from "@/services/voice-phone-tts.service";
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
  const admin = getVoiceRepository().client;
  const [context, knowledgeEntries, profileResult] = await Promise.all([
    getVoiceAiBusinessContext(businessId),
    listKnowledgeEntriesForBusiness(admin, businessId),
    admin
      .from("ai_assistant_profile")
      .select("system_prompt, language")
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;

  return {
    businessName: context.businessName,
    provider: context.provider,
    model: context.model,
    language: profile?.language?.trim() || context.language,
    systemPrompt: profile?.system_prompt?.trim() || context.systemPrompt,
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
  callObjective?: string | null;
}): Promise<{ success: true; text: string } | { success: false; message: string }> {
  const context = await loadBusinessContext(input.businessId);
  const phoneVoice = await loadPhoneVoiceSettings(input.businessId);
  const language =
    phoneVoice.language || input.settings.voiceLanguage || context.language;

  const systemPrompt = buildVoiceSystemPrompt({
    businessName: context.businessName,
    systemPrompt: context.systemPrompt,
    language,
    knowledgeContext: context.knowledgeContext,
    customVoicePrompt: input.settings.voiceSystemPrompt,
    callObjective: input.callObjective,
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

export async function generateVoiceOpeningLine(input: {
  businessId: string;
  direction: "inbound" | "outbound";
  callObjective: string;
  settings: VoiceAgentSettings;
  triggerReason?: string | null;
}): Promise<string | null> {
  const objective = input.callObjective.trim();
  if (!objective) {
    return null;
  }

  const context = await loadBusinessContext(input.businessId);
  const phoneVoice = await loadPhoneVoiceSettings(input.businessId);
  const language =
    phoneVoice.language || input.settings.voiceLanguage || context.language;

  const systemPrompt = buildVoiceSystemPrompt({
    businessName: context.businessName,
    systemPrompt: context.systemPrompt,
    language,
    knowledgeContext: context.knowledgeContext,
    customVoicePrompt: input.settings.voiceSystemPrompt,
    callObjective: objective,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  const result = await generateText({
    businessId: input.businessId,
    provider: context.provider as "gemini" | "openai" | "claude",
    model: context.model,
    systemInstruction: systemPrompt,
    prompt:
      "Write only one short opening sentence for this phone call. No quotes, no markdown.",
  });

  if (!result.success) {
    return null;
  }

  return sanitizeForSpeech(result.data.text);
}

function resolveOpeningLine(
  settings: VoiceAgentSettings,
  direction: "inbound" | "outbound",
) {
  return direction === "inbound"
    ? settings.inboundGreeting
    : settings.outboundScript;
}

async function buildSpokenConversationTwiml(input: {
  businessId: string;
  callSid: string;
  speech: string;
  gatherActionUrl: string;
  speechLocale: string;
  language: string;
  repromptSpeech: string;
  goodbyeSpeech: string;
  turnKey: string;
  includeGather?: boolean;
}): Promise<string> {
  const phoneVoice = await loadPhoneVoiceSettings(input.businessId);

  if (phoneVoice.useElevenLabs && input.callSid.trim()) {
    const audio = await synthesizePhoneSpeechAudio({
      businessId: input.businessId,
      callSid: input.callSid,
      text: input.speech,
      turnKey: input.turnKey,
    });

    if (audio.success) {
      if (input.includeGather === false) {
        return buildPlayTwiml({
          audioUrl: audio.audioUrl,
          speechLocale: input.speechLocale,
          goodbyeSpeech: input.goodbyeSpeech,
        });
      }

      return buildPlayAndGatherTwiml({
        audioUrl: audio.audioUrl,
        gatherActionUrl: input.gatherActionUrl,
        speechLocale: input.speechLocale,
        repromptSpeech: input.repromptSpeech,
        goodbyeSpeech: input.goodbyeSpeech,
      });
    }
  }

  if (input.includeGather === false) {
    return buildStaticSayTwiml({
      speech: `${input.speech} ${input.goodbyeSpeech}`,
      speechLocale: input.speechLocale,
    });
  }

  return buildSayAndGatherTwiml({
    speech: input.speech,
    gatherActionUrl: input.gatherActionUrl,
    speechLocale: input.speechLocale,
    reprompt: input.repromptSpeech,
  });
}

export async function buildVoiceConversationTwiml(input: {
  businessId: string;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
  forceAi?: boolean;
  callSid?: string | null;
}): Promise<string> {
  const settings = await getVoiceAgentSettings(input.businessId);
  const phoneVoice = await loadPhoneVoiceSettings(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(phoneVoice.language);
  const prompts = getVoicePhonePrompts(phoneVoice.language);
  const opening = resolveOpeningLine(settings, input.direction);
  const aiActive = input.forceAi || settings.aiEnabled;
  const callSid = input.callSid?.trim() || `opening-${Date.now()}`;

  if (!aiActive) {
    return applyCallRecordingToTwiml(
      input.businessId,
      buildStaticSayTwiml({ speech: opening, speechLocale }),
    );
  }

  if (isVoiceStreamEnabled() && callSid && phoneVoice.voiceId) {
    const wsBase = getVoiceStreamWsUrl();
    if (wsBase) {
      const wsUrl = `${wsBase.replace(/\/$/, "")}/voice/stream`;
      const recordingCallback = await resolveRecordingCallbackUrl(input.businessId);

      return applyCallRecordingToTwiml(
        input.businessId,
        buildMediaStreamConnectTwiml({
          businessId: input.businessId,
          wsUrl,
          callSid,
          direction: input.direction,
          triggerReason: input.triggerReason,
          recordingStatusCallback: recordingCallback,
        }),
      );
    }
  }

  const gatherUrl = buildGatherActionUrl({
    businessId: input.businessId,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  const twiml = await buildSpokenConversationTwiml({
    businessId: input.businessId,
    callSid,
    speech: opening,
    gatherActionUrl: gatherUrl,
    speechLocale,
    language: phoneVoice.language,
    repromptSpeech:
      input.direction === "outbound"
        ? prompts.outboundReprompt
        : prompts.inboundReprompt,
    goodbyeSpeech: prompts.goodbye,
    turnKey: "opening",
  });

  return applyCallRecordingToTwiml(input.businessId, twiml);
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
  const phoneVoice = await loadPhoneVoiceSettings(input.businessId);
  const speechLocale = mapVoiceLanguageToTwilioLocale(phoneVoice.language);
  const prompts = getVoicePhonePrompts(phoneVoice.language);
  const repo = getVoiceRepository();
  const callLog = await repo.findCallLogByExternalCallId(input.callSid);
  const aiActive =
    settings.aiEnabled ||
    callLog?.call_mode === "ai" ||
    callLog?.call_mode === "handoff";

  if (!aiActive) {
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
      speech: prompts.error,
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

    return await buildSpokenConversationTwiml({
      businessId: input.businessId,
      callSid: input.callSid,
      speech: prompts.repeat,
      gatherActionUrl: gatherUrl,
      speechLocale,
      language: phoneVoice.language,
      repromptSpeech: prompts.repeat,
      goodbyeSpeech: prompts.goodbye,
      turnKey: `repeat-${session.turn_count}`,
    });
  }

  if (session.turn_count >= MAX_VOICE_TURNS) {
    void markVoiceCallCompleted({ callSid: input.callSid, aiHandled: true });
    return applyCallRecordingToTwiml(
      input.businessId,
      buildGoodbyeTwiml(speechLocale),
    );
  }

  const shouldHandoff =
    hasTwilioVoiceClientEnv() &&
    (customerExplicitlyRequestedHuman(userSpeech) ||
      customerConfirmedHumanHandoff(userSpeech, session.turns));

  if (shouldHandoff) {
    void markVoiceCallHandoffByCallSid(input.callSid);
    const handoffTwiml = await buildHandoffAgentTwiml(input.businessId);
    return applyCallRecordingToTwiml(input.businessId, handoffTwiml);
  }

  const reply = await generateVoiceAiReply({
    businessId: input.businessId,
    userMessage: userSpeech,
    conversationHistory: session.turns,
    direction: input.direction,
    triggerReason: input.triggerReason,
    settings,
    callObjective: callLog?.custom_prompt,
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

  const nextTurnCount = session.turn_count + 1;

  if (nextTurnCount >= MAX_VOICE_TURNS) {
    void markVoiceCallCompleted({ callSid: input.callSid, aiHandled: true });

    return applyCallRecordingToTwiml(
      input.businessId,
      await buildSpokenConversationTwiml({
        businessId: input.businessId,
        callSid: input.callSid,
        speech: `${assistantText} ${prompts.goodbye}`,
        gatherActionUrl: "",
        speechLocale,
        language: phoneVoice.language,
        repromptSpeech: prompts.repeat,
        goodbyeSpeech: prompts.goodbye,
        turnKey: `final-${nextTurnCount}`,
        includeGather: false,
      }),
    );
  }

  const gatherUrl = buildGatherActionUrl({
    businessId: input.businessId,
    direction: input.direction,
    triggerReason: input.triggerReason,
  });

  return applyCallRecordingToTwiml(
    input.businessId,
    await buildSpokenConversationTwiml({
      businessId: input.businessId,
      callSid: input.callSid,
      speech: assistantText,
      gatherActionUrl: gatherUrl,
      speechLocale,
      language: phoneVoice.language,
      repromptSpeech: prompts.repeat,
      goodbyeSpeech: prompts.goodbye,
      turnKey: `turn-${nextTurnCount}`,
    }),
  );
}
