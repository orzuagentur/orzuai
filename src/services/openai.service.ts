import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import type { AiProvider } from "@/lib/ai/constants";
import { buildAssistantSystemInstruction } from "@/lib/gemini/prompts";
import type {
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "@/types/gemini.types";

function getOpenAiApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function hasOpenAiEnv(): boolean {
  return Boolean(getOpenAiApiKey());
}

function missingConfigError(): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: "OpenAI API is not configured. Add OPENAI_API_KEY to your environment.",
    },
  };
}

type OpenAiUsage = {
  inputTokens: number;
  outputTokens: number;
};

async function callOpenAiChat(input: {
  model: string;
  systemInstruction?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<
  | { success: true; text: string; model: string; usage: OpenAiUsage }
  | { success: false; message: string }
> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return { success: false, message: "OpenAI API key missing." };
  }

  const messages = input.systemInstruction
    ? [{ role: "system" as const, content: input.systemInstruction }, ...input.messages]
    : input.messages;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      message: body.slice(0, 300) || `OpenAI request failed (${response.status}).`,
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    return { success: false, message: "OpenAI returned an empty response." };
  }

  const promptText = messages.map((message) => message.content).join("\n");

  return {
    success: true,
    text,
    model: payload.model ?? input.model,
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? estimateTokensFromText(promptText),
      outputTokens:
        payload.usage?.completion_tokens ?? estimateTokensFromText(text),
    },
  };
}

export async function generateOpenAiText(
  input: GenerateTextInput,
): Promise<GeminiServiceResult & { usage?: OpenAiUsage; provider?: AiProvider }> {
  if (!hasOpenAiEnv()) {
    return missingConfigError();
  }

  const model = input.model ?? "gpt-4o-mini";
  const result = await callOpenAiChat({
    model,
    systemInstruction: input.systemInstruction,
    messages: [{ role: "user", content: input.prompt }],
  });

  if (!result.success) {
    return {
      success: false,
      error: { code: "GENERATION_FAILED", message: result.message },
    };
  }

  return {
    success: true,
    data: { text: result.text, model: result.model },
    usage: result.usage,
    provider: "openai",
  };
}

export async function generateOpenAiAssistantReply(
  input: GenerateAssistantReplyInput,
): Promise<GeminiServiceResult & { usage?: OpenAiUsage; provider?: AiProvider }> {
  if (!hasOpenAiEnv()) {
    return missingConfigError();
  }

  const model = input.model ?? "gpt-4o-mini";
  const systemInstruction = buildAssistantSystemInstruction({
    systemPrompt: input.systemPrompt,
    language: input.language,
    knowledgeContext: input.knowledgeContext,
  });

  const history =
    input.conversationHistory?.map((message) => ({
      role: message.role,
      content: message.content,
    })) ?? [];

  const messages = [...history, { role: "user" as const, content: input.userMessage }];
  const result = await callOpenAiChat({ model, systemInstruction, messages });

  if (!result.success) {
    return {
      success: false,
      error: { code: "GENERATION_FAILED", message: result.message },
    };
  }

  return {
    success: true,
    data: { text: result.text, model: result.model },
    usage: result.usage,
    provider: "openai",
  };
}
