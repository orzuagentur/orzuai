import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import {
  getDefaultModelForProvider,
  resolveAiModel,
  type AiProvider,
} from "@/lib/ai/constants";
import { hasGeminiEnv } from "@/lib/env";
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
  };

export type LlmTextInput = GenerateTextInput &
  LlmTrackingContext & {
    provider?: AiProvider;
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

type GenerationWithUsage = GeminiServiceResult & {
  usage?: { inputTokens: number; outputTokens: number };
  provider?: AiProvider;
};

export async function generateAssistantReply(
  input: LlmAssistantInput,
): Promise<GeminiServiceResult> {
  const provider = resolveProvider(input.provider);
  const model = resolveAiModel(provider, input.model ?? getDefaultModelForProvider(provider));

  if (!isProviderConfigured(provider)) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: `${provider} API is not configured.`,
      },
    };
  }

  if (input.businessId && !input.skipUsageLimit) {
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
    result = await generateOpenAiAssistantReply({ ...input, model });
  } else if (provider === "claude") {
    result = await generateClaudeAssistantReply({ ...input, model });
  } else {
    result = await generateGeminiAssistantReply({ ...input, model });
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
    });
  }

  return result;
}

export async function generateText(
  input: LlmTextInput,
): Promise<GeminiServiceResult> {
  const provider = resolveProvider(input.provider);
  const model = resolveAiModel(provider, input.model ?? getDefaultModelForProvider(provider));

  if (!isProviderConfigured(provider)) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: `${provider} API is not configured.`,
      },
    };
  }

  if (input.businessId && !input.skipUsageLimit) {
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
    result = await generateOpenAiText({ ...input, model });
  } else if (provider === "claude") {
    result = await generateClaudeText({ ...input, model });
  } else {
    result = await generateGeminiText({ ...input, model });
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
    });
  }

  return result;
}
