import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import type { AiProvider } from "@/lib/ai/constants";
import { buildAssistantSystemInstruction } from "@/lib/gemini/prompts";
import type {
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "@/types/gemini.types";

function getClaudeApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function hasClaudeEnv(): boolean {
  return Boolean(getClaudeApiKey());
}

function missingConfigError(): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message:
        "Anthropic API is not configured. Add ANTHROPIC_API_KEY to your environment.",
    },
  };
}

type ClaudeUsage = {
  inputTokens: number;
  outputTokens: number;
};

async function callClaudeMessages(input: {
  model: string;
  systemInstruction?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<
  | { success: true; text: string; model: string; usage: ClaudeUsage }
  | { success: false; message: string }
> {
  const apiKey = getClaudeApiKey();

  if (!apiKey) {
    return { success: false, message: "Anthropic API key missing." };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 1024,
      system: input.systemInstruction,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      message:
        body.slice(0, 300) || `Anthropic request failed (${response.status}).`,
    };
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    model?: string;
  };

  const text = payload.content
    ?.map((block) => block.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return { success: false, message: "Claude returned an empty response." };
  }

  const promptText = input.messages.map((message) => message.content).join("\n");

  return {
    success: true,
    text,
    model: payload.model ?? input.model,
    usage: {
      inputTokens: payload.usage?.input_tokens ?? estimateTokensFromText(promptText),
      outputTokens:
        payload.usage?.output_tokens ?? estimateTokensFromText(text),
    },
  };
}

export async function generateClaudeText(
  input: GenerateTextInput,
): Promise<GeminiServiceResult & { usage?: ClaudeUsage; provider?: AiProvider }> {
  if (!hasClaudeEnv()) {
    return missingConfigError();
  }

  const model = input.model ?? "claude-3-5-haiku-latest";
  const result = await callClaudeMessages({
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
    provider: "claude",
  };
}

export async function generateClaudeAssistantReply(
  input: GenerateAssistantReplyInput,
): Promise<GeminiServiceResult & { usage?: ClaudeUsage; provider?: AiProvider }> {
  if (!hasClaudeEnv()) {
    return missingConfigError();
  }

  const model = input.model ?? "claude-3-5-haiku-latest";
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
  const result = await callClaudeMessages({ model, systemInstruction, messages });

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
    provider: "claude",
  };
}
