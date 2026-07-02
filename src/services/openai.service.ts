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
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<
  | { success: true; text: string; model: string; usage: OpenAiUsage }
  | { success: false; message: string }
> {
  const apiKey = input.apiKey?.trim() || getOpenAiApiKey();

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
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 1024,
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

type ProviderInput<T> = T & { apiKey?: string };

export async function* streamOpenAiText(input: {
  model: string;
  systemInstruction?: string;
  prompt: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<string, void, void> {
  const apiKey = input.apiKey?.trim() || getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("OpenAI API key missing.");
  }

  const messages = input.systemInstruction
    ? [
        { role: "system" as const, content: input.systemInstruction },
        { role: "user" as const, content: input.prompt },
      ]
    : [{ role: "user" as const, content: input.prompt }];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages,
      temperature: input.temperature ?? 0.6,
      max_tokens: input.maxTokens ?? 180,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(
      body.slice(0, 300) || `OpenAI stream failed (${response.status}).`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") {
        return;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }
  }
}

export async function generateOpenAiText(
  input: ProviderInput<GenerateTextInput>,
): Promise<GeminiServiceResult & { usage?: OpenAiUsage; provider?: AiProvider }> {
  if (!hasOpenAiEnv() && !input.apiKey) {
    return missingConfigError();
  }

  const model = input.model ?? "gpt-4o-mini";
  const result = await callOpenAiChat({
    model,
    systemInstruction: input.systemInstruction,
    messages: [{ role: "user", content: input.prompt }],
    apiKey: input.apiKey,
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
  input: ProviderInput<GenerateAssistantReplyInput>,
): Promise<GeminiServiceResult & { usage?: OpenAiUsage; provider?: AiProvider }> {
  if (!hasOpenAiEnv() && !input.apiKey) {
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
  const result = await callOpenAiChat({
    model,
    systemInstruction,
    messages,
    apiKey: input.apiKey,
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
