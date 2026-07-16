import "server-only";

import {
  GoogleGenerativeAIResponseError,
  GoogleGenerativeAIRequestInputError,
} from "@google/generative-ai";

import { GEMINI_GENERATION, getGeminiModel } from "@/lib/gemini";
import {
  buildAssistantSystemInstruction,
  GEMINI_SAFETY_SETTINGS,
  mapConversationHistoryToGeminiContents,
} from "@/lib/gemini/prompts";
import {
  ORCHESTRATOR_GEMINI_TOOL_CONFIG,
  ORCHESTRATOR_GEMINI_TOOLS,
  extractOrchestratorToolArgs,
} from "@/lib/ai/tools/orchestrator-gemini";
import { getGeminiDefaultModel, hasGeminiEnv } from "@/lib/env";
import type {
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "@/types/gemini.types";
import {
  generateAssistantReplySchema,
  generateTextSchema,
} from "@/types/gemini.types";

function validationError(message: string): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

function missingConfigError(): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message:
        "Gemini is not configured. Missing required environment variables.",
    },
  };
}

function generationFailedError(message: string): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "GENERATION_FAILED",
      message,
    },
  };
}

function contentBlockedError(message: string): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "CONTENT_BLOCKED",
      message,
    },
  };
}

function emptyResponseError(): GeminiServiceResult {
  return {
    success: false,
    error: {
      code: "EMPTY_RESPONSE",
      message: "Gemini returned an empty response.",
    },
  };
}

function resolveModelName(model?: string): string {
  return model ?? getGeminiDefaultModel();
}

function mapGeminiError(error: unknown): GeminiServiceResult {
  if (error instanceof GoogleGenerativeAIRequestInputError) {
    return validationError(error.message);
  }

  if (error instanceof GoogleGenerativeAIResponseError) {
    const response = error.response;

    if (response.promptFeedback?.blockReason) {
      return contentBlockedError(
        `Prompt blocked: ${response.promptFeedback.blockReason}`,
      );
    }

    const candidate = response.candidates?.[0];

    if (candidate?.finishReason === "SAFETY") {
      return contentBlockedError("Response blocked by Gemini safety filters.");
    }

    return generationFailedError(error.message);
  }

  if (error instanceof Error) {
    return generationFailedError(error.message);
  }

  return generationFailedError("An unexpected Gemini error occurred.");
}

function extractResponseText(text: string | undefined): GeminiServiceResult {
  const normalizedText = text?.trim();

  if (!normalizedText) {
    return emptyResponseError();
  }

  return {
    success: true,
    data: {
      text: normalizedText,
      model: "",
    },
  };
}

type ProviderInput<T> = T & { apiKey?: string };

export async function generateText(
  input: ProviderInput<GenerateTextInput>,
): Promise<GeminiServiceResult> {
  if (!hasGeminiEnv() && !input.apiKey) {
    return missingConfigError();
  }

  const parsed = generateTextSchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const modelName = resolveModelName(parsed.data.model);

  try {
    const model = getGeminiModel({
      model: modelName,
      systemInstruction: parsed.data.systemInstruction,
      apiKey: input.apiKey,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: parsed.data.prompt }] }],
      generationConfig: GEMINI_GENERATION,
      safetySettings: [...GEMINI_SAFETY_SETTINGS],
    });

    const response = extractResponseText(result.response.text());

    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: {
        text: response.data.text,
        model: modelName,
      },
    };
  } catch (error) {
    return mapGeminiError(error);
  }
}

export async function generateAssistantReply(
  input: ProviderInput<GenerateAssistantReplyInput>,
): Promise<GeminiServiceResult> {
  if (!hasGeminiEnv() && !input.apiKey) {
    return missingConfigError();
  }

  const parsed = generateAssistantReplySchema.safeParse(input);

  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const modelName = resolveModelName(parsed.data.model);
  const systemInstruction = buildAssistantSystemInstruction({
    systemPrompt: parsed.data.systemPrompt,
    language: parsed.data.language,
    knowledgeContext: parsed.data.knowledgeContext,
  });

  try {
    const model = getGeminiModel({
      model: modelName,
      systemInstruction,
      apiKey: input.apiKey,
    });

    const history = mapConversationHistoryToGeminiContents(
      parsed.data.conversationHistory ?? [],
    );

    const chat = model.startChat({
      history,
      generationConfig: GEMINI_GENERATION,
      safetySettings: [...GEMINI_SAFETY_SETTINGS],
    });

    const result = await chat.sendMessage(parsed.data.userMessage);
    const response = extractResponseText(result.response.text());

    if (!response.success) {
      return response;
    }

    return {
      success: true,
      data: {
        text: response.data.text,
        model: modelName,
      },
    };
  } catch (error) {
    return mapGeminiError(error);
  }
}

export type GeminiOrchestratorToolResult =
  | { success: true; data: { args: unknown; model: string } }
  | {
      success: false;
      error: {
        code:
          | "VALIDATION_ERROR"
          | "MISSING_CONFIG"
          | "GENERATION_FAILED"
          | "CONTENT_BLOCKED"
          | "EMPTY_RESPONSE";
        message: string;
      };
    };

function toOrchestratorToolError(
  result: GeminiServiceResult,
): GeminiOrchestratorToolResult {
  if (result.success) {
    return {
      success: false,
      error: {
        code: "GENERATION_FAILED",
        message: "Unexpected Gemini text response for orchestrator tools.",
      },
    };
  }

  return result;
}

/** Native Gemini function calling for CRM orchestration plans. */
export async function generateOrchestratorToolPlan(input: {
  model?: string;
  apiKey?: string;
  systemInstruction: string;
  prompt: string;
}): Promise<GeminiOrchestratorToolResult> {
  if (!hasGeminiEnv() && !input.apiKey) {
    return toOrchestratorToolError(missingConfigError());
  }

  const systemInstruction = input.systemInstruction.trim();
  const prompt = input.prompt.trim();

  if (!systemInstruction || !prompt) {
    return toOrchestratorToolError(
      validationError("Orchestrator prompt is required."),
    );
  }

  if (prompt.length > 12_000 || systemInstruction.length > 8_000) {
    return toOrchestratorToolError(
      validationError("Orchestrator prompt exceeds maximum length."),
    );
  }

  const modelName = resolveModelName(input.model);

  try {
    const model = getGeminiModel({
      model: modelName,
      systemInstruction,
      apiKey: input.apiKey,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: ORCHESTRATOR_GEMINI_TOOLS,
      toolConfig: ORCHESTRATOR_GEMINI_TOOL_CONFIG,
      generationConfig: {
        ...GEMINI_GENERATION,
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
      safetySettings: [...GEMINI_SAFETY_SETTINGS],
    });

    const args = extractOrchestratorToolArgs(result.response);

    if (!args) {
      return toOrchestratorToolError(emptyResponseError());
    }

    return {
      success: true,
      data: {
        args,
        model: modelName,
      },
    };
  } catch (error) {
    return toOrchestratorToolError(mapGeminiError(error));
  }
}
