import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import {
  CUSTOMER_FACING_AI_CALL_TYPES,
  DEFAULT_LLM_FALLBACK_PROVIDERS,
  type AiCallType,
} from "@/lib/ai/call-types";
import { resolveLlmModel, type AiProvider } from "@/lib/ai/constants";
import { hasGeminiEnv } from "@/lib/env";
import {
  getBusinessPreferCustomerAiKeys,
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
  callType?: AiCallType;
  /** @deprecated Use callType — background calls skip limits automatically */
  skipUsageLimit?: boolean;
  /** @deprecated All calls are logged when businessId is set */
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

export type LlmFallbackResult = GeminiServiceResult & {
  usedProvider?: AiProvider;
  attemptedProviders: AiProvider[];
};

export function getProviderAvailability() {
  return {
    gemini: hasGeminiEnv(),
    openai: hasOpenAiEnv(),
    claude: hasClaudeEnv(),
  };
}

export function isProviderConfigured(provider: AiProvider): boolean {
  return getProviderAvailability()[provider];
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

function shouldEnforceUsageLimit(input: LlmTrackingContext): boolean {
  if (input.skipUsageLimit) {
    return false;
  }

  const callType = input.callType ?? "other";
  return CUSTOMER_FACING_AI_CALL_TYPES.has(callType);
}

function shouldLogUsage(input: LlmTrackingContext): boolean {
  if (input.skipUsageLog) {
    return false;
  }

  return Boolean(input.businessId);
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

async function runAssistantGeneration(input: {
  provider: AiProvider;
  apiKey?: string;
  model: string;
  generationInput: LlmAssistantInput;
}): Promise<GenerationWithUsage> {
  const { provider, apiKey, model, generationInput } = input;

  if (provider === "openai") {
    const result = await generateOpenAiAssistantReply({
      ...generationInput,
      model,
      apiKey,
    });
    return { ...result, provider: "openai" };
  }

  if (provider === "claude") {
    const result = await generateClaudeAssistantReply({
      ...generationInput,
      model,
      apiKey,
    });
    return { ...result, provider: "claude" };
  }

  const result = await generateGeminiAssistantReply({
    ...generationInput,
    model,
    apiKey,
  });
  return { ...result, provider: "gemini" };
}

async function runTextGeneration(input: {
  provider: AiProvider;
  apiKey?: string;
  model: string;
  generationInput: LlmTextInput;
}): Promise<GenerationWithUsage> {
  const { provider, apiKey, model, generationInput } = input;

  if (provider === "openai") {
    const result = await generateOpenAiText({
      ...generationInput,
      model,
      apiKey,
    });
    return { ...result, provider: "openai" };
  }

  if (provider === "claude") {
    const result = await generateClaudeText({
      ...generationInput,
      model,
      apiKey,
    });
    return { ...result, provider: "claude" };
  }

  const result = await generateGeminiText({
    ...generationInput,
    model,
    apiKey,
  });
  return { ...result, provider: "gemini" };
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
    shouldEnforceUsageLimit(input) &&
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

  const result = await runAssistantGeneration({
    provider,
    apiKey,
    model,
    generationInput: input,
  });

  if (!result.success) {
    return result;
  }

  const promptText = [
    input.systemPrompt,
    input.userMessage,
    ...(input.conversationHistory?.map((message) => message.content) ?? []),
  ].join("\n");

  if (shouldLogUsage(input)) {
    await logAiUsage({
      businessId: input.businessId!,
      conversationId: input.conversationId,
      provider: result.provider ?? provider,
      model: result.data.model,
      inputTokens:
        result.usage?.inputTokens ?? estimateTokensFromText(promptText),
      outputTokens:
        result.usage?.outputTokens ?? estimateTokensFromText(result.data.text),
      billingSource,
      callType: input.callType ?? "other",
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
    shouldEnforceUsageLimit(input) &&
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

  const result = await runTextGeneration({
    provider,
    apiKey,
    model,
    generationInput: input,
  });

  if (!result.success) {
    return result;
  }

  const promptText = [input.systemInstruction, input.prompt]
    .filter(Boolean)
    .join("\n");

  if (shouldLogUsage(input)) {
    await logAiUsage({
      businessId: input.businessId!,
      conversationId: input.conversationId,
      provider: result.provider ?? provider,
      model: result.data.model,
      inputTokens:
        result.usage?.inputTokens ?? estimateTokensFromText(promptText),
      outputTokens:
        result.usage?.outputTokens ?? estimateTokensFromText(result.data.text),
      billingSource,
      callType: input.callType ?? "other",
    });
  }

  return result;
}

function getFallbackProviderOrder(
  preferred?: AiProvider,
): readonly AiProvider[] {
  if (!preferred) {
    return DEFAULT_LLM_FALLBACK_PROVIDERS;
  }

  return [
    preferred,
    ...DEFAULT_LLM_FALLBACK_PROVIDERS.filter((provider) => provider !== preferred),
  ];
}

export async function generateAssistantReplyWithFallback(
  input: LlmAssistantInput & { preferredProvider?: AiProvider },
): Promise<LlmFallbackResult> {
  const attemptedProviders: AiProvider[] = [];
  let lastError: GeminiServiceResult | null = null;

  for (const provider of getFallbackProviderOrder(input.preferredProvider)) {
    if (!isProviderReady(provider)) {
      continue;
    }

    attemptedProviders.push(provider);
    const result = await generateAssistantReply({
      ...input,
      provider,
    });

    if (result.success) {
      return {
        ...result,
        usedProvider: provider,
        attemptedProviders,
      };
    }

    lastError = result;
  }

  if (lastError) {
    return {
      ...lastError,
      attemptedProviders,
    };
  }

  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: "No LLM provider is configured.",
    },
    attemptedProviders,
  };
}

export async function generateTextWithFallback(
  input: LlmTextInput & { preferredProvider?: AiProvider },
): Promise<LlmFallbackResult> {
  const attemptedProviders: AiProvider[] = [];
  let lastError: GeminiServiceResult | null = null;

  for (const provider of getFallbackProviderOrder(input.preferredProvider)) {
    if (!isProviderReady(provider)) {
      continue;
    }

    attemptedProviders.push(provider);
    const result = await generateText({
      ...input,
      provider,
    });

    if (result.success) {
      return {
        ...result,
        usedProvider: provider,
        attemptedProviders,
      };
    }

    lastError = result;
  }

  if (lastError) {
    return {
      ...lastError,
      attemptedProviders,
    };
  }

  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: "No LLM provider is configured.",
    },
    attemptedProviders,
  };
}

export async function businessPrefersCustomerAiKeys(
  businessId: string,
): Promise<boolean> {
  return getBusinessPreferCustomerAiKeys(businessId);
}
