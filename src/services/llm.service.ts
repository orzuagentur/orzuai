import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import { resolveLlmModel, type AiProvider } from "@/lib/ai/constants";
import { hasGeminiEnv } from "@/lib/env";
import {
  resolveBusinessLlmCredentials,
} from "@/services/business-ai-credentials.service";
import {
  generateClaudeAssistantReply,
  generateClaudeText,
  hasClaudeEnv,
} from "@/services/claude.service";
import {
  generateAssistantReply as generateGeminiAssistantReply,
  generateText as generateGeminiText,
} from "@/services/gemini.service";
import {
  assertAiUsageAllowed,
  logAiUsage,
} from "@/services/ai-usage.service";
import {
  generateOpenAiAssistantReply,
  generateOpenAiText,
  hasOpenAiEnv,
} from "@/services/openai.service";
import type {
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "@/types/gemini.types";

export type LlmTrackingContext = {
  businessId?: string;
  conversationId?: string | null;
  skipUsageLimit?: boolean;
  skipUsageLog?: boolean;
};

export type LlmAssistantInput = GenerateAssistantReplyInput &
  LlmTrackingContext & {
    provider?: AiProvider;
    apiKey?: string;
    billingSource?: "platform" | "customer";
  };

export type LlmTextInput = GenerateTextInput &
  LlmTrackingContext & {
    provider?: AiProvider;
    apiKey?: string;
    billingSource?: "platform" | "customer";
  };

export function getProviderAvailability() {
  return {
    gemini: hasGeminiEnv(),
    openai: hasOpenAiEnv(),
    claude: hasClaudeEnv(),
  };
}

export function isProviderConfigured(provider: AiProvider): boolean {
  const availability = getProviderAvailability();
  return availability[provider];
}

function resolveProvider(inputProvider?: AiProvider): AiProvider {
  if (inputProvider && isProviderConfigured(inputProvider)) {
    return inputProvider;
  }

  if (hasGeminiEnv()) {
    return "gemini";
  }

  if (hasOpenAiEnv()) {
    return "openai";
  }

  if (hasClaudeEnv()) {
    return "claude";
  }

  return inputProvider ?? "gemini";
}

function isProviderReady(provider: AiProvider, apiKey?: string): boolean {
  if (apiKey?.trim()) {
    return true;
  }

  return isProviderConfigured(provider);
}

type GenerationWithUsage = GeminiServiceResult & {
  usage?: { inputTokens: number; outputTokens: number };
  provider?: AiProvider;
};

async function resolveGenerationContext(input: {
  businessId?: string;
  provider?: AiProvider;
  model?: string;
  apiKey?: string;
  billingSource?: "platform" | "customer";
}) {
  const provider = resolveProvider(input.provider);
  const credentials = await resolveBusinessLlmCredentials(
    input.businessId,
    provider,
  );
  const apiKey = input.apiKey ?? credentials.apiKey ?? undefined;
  const billingSource = input.billingSource ?? credentials.billingSource;
  const model = resolveLlmModel(provider, input.model);

  return { provider, apiKey, billingSource, model };
}

export async function generateAssistantReply(
  input: LlmAssistantInput,
): Promise<GeminiServiceResult> {
  const { provider, apiKey, billingSource, model } =
    await resolveGenerationContext(input);

  if (!isProviderReady(provider, apiKey)) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: `${provider} API is not configured.`,
      },
    };
  }

  if (
    input.businessId &&
    !input.skipUsageLimit &&
    billingSource === "platform"
  ) {
    const allowed = await assertAiUsageAllowed(input.businessId);

    if (!allowed.allowed) {
      return {
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: allowed.message,
        },
      };
    }
  }

  let result: GenerationWithUsage;

  if (provider === "openai") {
    result = await generateOpenAiAssistantReply({ ...input, model, apiKey });
  } else if (provider === "claude") {
    result = await generateClaudeAssistantReply({ ...input, model, apiKey });
  } else {
    result = await generateGeminiAssistantReply({ ...input, model, apiKey });
    result.provider = "gemini";
  }

  if (!result.success) {
    return result;
  }

  const promptText = [
    input.systemPrompt,
    input.userMessage,
    ...(input.conversationHistory?.map((message) => message.content) ?? []),
  ].join("\n");

  if (input.businessId && !input.skipUsageLog) {
    await logAiUsage({
      businessId: input.businessId,
      conversationId: input.conversationId,
      provider: result.provider ?? provider,
      model: result.data.model,
      inputTokens:
        result.usage?.inputTokens ?? estimateTokensFromText(promptText),
      outputTokens:
        result.usage?.outputTokens ?? estimateTokensFromText(result.data.text),
      billingSource,
    });
  }

  return result;
}

export async function generateText(
  input: LlmTextInput,
): Promise<GeminiServiceResult> {
  const { provider, apiKey, billingSource, model } =
    await resolveGenerationContext(input);

  if (!isProviderReady(provider, apiKey)) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: `${provider} API is not configured.`,
      },
    };
  }

  if (
    input.businessId &&
    !input.skipUsageLimit &&
    billingSource === "platform"
  ) {
    const allowed = await assertAiUsageAllowed(input.businessId);

    if (!allowed.allowed) {
      return {
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: allowed.message,
        },
      };
    }
  }

  let result: GenerationWithUsage;

  if (provider === "openai") {
    result = await generateOpenAiText({ ...input, model, apiKey });
  } else if (provider === "claude") {
    result = await generateClaudeText({ ...input, model, apiKey });
  } else {
    result = await generateGeminiText({ ...input, model, apiKey });
    result.provider = "gemini";
  }

  if (!result.success) {
    return result;
  }

  const promptText = [input.systemInstruction, input.prompt]
    .filter(Boolean)
    .join("\n");

  if (input.businessId && !input.skipUsageLog) {
    await logAiUsage({
      businessId: input.businessId,
      conversationId: input.conversationId,
      provider: result.provider ?? provider,
      model: result.data.model,
      inputTokens:
        result.usage?.inputTokens ?? estimateTokensFromText(promptText),
      outputTokens:
        result.usage?.outputTokens ?? estimateTokensFromText(result.data.text),
      billingSource,
    });
  }

  return result;
}
