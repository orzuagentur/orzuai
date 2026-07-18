import "server-only";

import { estimateTokensFromText } from "@/lib/ai/cost";
import {
  CUSTOMER_FACING_AI_CALL_TYPES,
  type AiCallType,
} from "@/lib/ai/call-types";
import { resolveLlmModel, type AiProvider } from "@/lib/ai/constants";
import {
  getPlatformLlmProviderQueue,
} from "@/lib/ai/platform-llm-config";
import {
  getPlatformAiFallbackProviders,
  resolvePlatformAiForCallType,
} from "@/services/platform-ai-config.service";
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
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";
import type {
  GeminiServiceResult,
  GenerateAssistantReplyInput,
  GenerateTextInput,
} from "@/types/gemini.types";

function isExpectedLlmDenial(message: string | undefined): boolean {
  return Boolean(message && /limit|quota|monthly/i.test(message));
}

function reportLlmFallbackFailure(input: {
  callType?: AiCallType;
  businessId?: string;
  conversationId?: string | null;
  attemptedProviders: AiProvider[];
  error?: { code: string; message: string } | null;
  mode: "assistant" | "text";
}): void {
  const message = input.error?.message ?? "LLM generation failed.";
  if (isExpectedLlmDenial(message)) {
    return;
  }

  const isMissingConfig = input.error?.code === "MISSING_CONFIG";

  schedulePlatformErrorReport({
    severity: isMissingConfig ? "warning" : "high",
    module: "ai",
    category: "llm",
    source: "llm",
    title: isMissingConfig
      ? "No LLM provider configured"
      : "LLM fallback exhausted",
    message,
    businessId: input.businessId ?? null,
    conversationId: input.conversationId ?? null,
    ai: {
      mode: input.mode,
      callType: input.callType ?? "other",
      attemptedProviders: input.attemptedProviders,
      errorCode: input.error?.code ?? null,
    },
    rootCause: isMissingConfig
      ? "No ready LLM provider keys/config for this call."
      : "All configured LLM providers failed for this request.",
    suggestedFix: isMissingConfig
      ? "Configure Gemini/OpenAI/Claude keys or platform AI overrides."
      : "Check provider status, API keys, and model availability.",
  });
}

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
  };

export type LlmTextInput = GenerateTextInput &
  LlmTrackingContext & {
    provider?: AiProvider;
    apiKey?: string;
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
  provider?: AiProvider;
  model?: string;
  apiKey?: string;
  businessId?: string;
}) {
  const provider = resolveProvider(input.provider);
  const model = resolveLlmModel(provider, input.model);

  if (input.apiKey?.trim()) {
    return {
      provider,
      apiKey: input.apiKey,
      billingSource: "platform" as const,
      model,
    };
  }

  if (
    input.businessId &&
    (provider === "gemini" || provider === "openai")
  ) {
    try {
      const {
        businessPrefersCustomerAiKeys,
        resolveBusinessAiProviderKey,
      } = await import("@/services/business-ai-keys.service");

      const prefersCustomer = await businessPrefersCustomerAiKeys(
        input.businessId,
      );

      if (prefersCustomer) {
        const customerKey = await resolveBusinessAiProviderKey(
          input.businessId,
          provider,
        );

        if (customerKey?.trim()) {
          return {
            provider,
            apiKey: customerKey,
            billingSource: "customer" as const,
            model,
          };
        }
      }
    } catch (error) {
      console.warn(
        "[llm] customer key resolve failed; falling back to platform",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  return {
    provider,
    apiKey: input.apiKey,
    billingSource: "platform" as const,
    model,
  };
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
  let { provider, apiKey, billingSource, model } =
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
    shouldEnforceUsageLimit(input)
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

  let result = await runAssistantGeneration({
    provider,
    apiKey,
    model,
    generationInput: input,
  });

  if (!result.success && billingSource === "customer" && !input.apiKey) {
    console.warn(
      "[llm] customer key generation failed; falling back to platform",
      result.error.message,
    );
    provider = resolveProvider(input.provider);
    apiKey = undefined;
    billingSource = "platform";
    model = resolveLlmModel(provider, input.model);

    if (!isProviderReady(provider, apiKey)) {
      return result;
    }

    result = await runAssistantGeneration({
      provider,
      apiKey,
      model,
      generationInput: input,
    });
  }

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
  let { provider, apiKey, billingSource, model } =
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
    shouldEnforceUsageLimit(input)
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

  let result = await runTextGeneration({
    provider,
    apiKey,
    model,
    generationInput: input,
  });

  if (!result.success && billingSource === "customer" && !input.apiKey) {
    console.warn(
      "[llm] customer key text generation failed; falling back to platform",
      result.error.message,
    );
    provider = resolveProvider(input.provider);
    apiKey = undefined;
    billingSource = "platform";
    model = resolveLlmModel(provider, input.model);

    if (!isProviderReady(provider, apiKey)) {
      return result;
    }

    result = await runTextGeneration({
      provider,
      apiKey,
      model,
      generationInput: input,
    });
  }

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
  const queue = getPlatformLlmProviderQueue();

  if (!preferred) {
    return queue;
  }

  return [preferred, ...queue.filter((provider) => provider !== preferred)];
}

async function getFallbackProviderOrderForCall(input: {
  preferred?: AiProvider;
  callType?: AiCallType;
}): Promise<readonly AiProvider[]> {
  if (input.callType) {
    return getPlatformAiFallbackProviders(input.callType);
  }

  return getFallbackProviderOrder(input.preferred);
}

async function resolveCallTypePlatformOverrides(input: {
  callType?: AiCallType;
  preferredProvider?: AiProvider;
  model?: string;
  apiKey?: string;
}): Promise<{
  preferredProvider?: AiProvider;
  model?: string;
  apiKey?: string;
}> {
  if (!input.callType) {
    return {
      preferredProvider: input.preferredProvider,
      model: input.model,
      apiKey: input.apiKey,
    };
  }

  const platformConfig = await resolvePlatformAiForCallType(input.callType);

  if (!platformConfig) {
    return {
      preferredProvider: input.preferredProvider,
      model: input.model,
      apiKey: input.apiKey,
    };
  }

  const provider = platformConfig.provider;

  if (
    provider !== "gemini" &&
    provider !== "openai" &&
    provider !== "claude"
  ) {
    return {
      preferredProvider: input.preferredProvider,
      model: input.model,
      apiKey: input.apiKey,
    };
  }

  return {
    preferredProvider: provider,
    model: platformConfig.model ?? input.model,
    apiKey: platformConfig.apiKey ?? input.apiKey,
  };
}

export function getPlatformLlmFallbackOrder(
  preferred?: AiProvider,
): AiProvider[] {
  return [...getFallbackProviderOrder(preferred)];
}

export async function generateAssistantReplyWithFallback(
  input: LlmAssistantInput & { preferredProvider?: AiProvider },
): Promise<LlmFallbackResult> {
  const platformOverrides = await resolveCallTypePlatformOverrides({
    callType: input.callType,
    preferredProvider: input.preferredProvider,
    model: input.model,
    apiKey: input.apiKey,
  });

  const attemptedProviders: AiProvider[] = [];
  let lastError: GeminiServiceResult | null = null;

  for (const provider of await getFallbackProviderOrderForCall({
    preferred: platformOverrides.preferredProvider,
    callType: input.callType,
  })) {
    if (!isProviderReady(provider, platformOverrides.apiKey)) {
      continue;
    }

    attemptedProviders.push(provider);
    const result = await generateAssistantReply({
      ...input,
      ...platformOverrides,
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

    console.warn(
      "[llm] provider failed",
      JSON.stringify({
        provider,
        model: resolveLlmModel(provider, input.model),
        errorCode: result.error?.code,
        errorMessage: result.error?.message?.slice(0, 300),
      }),
    );
  }

  if (lastError) {
    reportLlmFallbackFailure({
      callType: input.callType,
      businessId: input.businessId,
      conversationId: input.conversationId,
      attemptedProviders,
      error: lastError.success ? null : lastError.error,
      mode: "assistant",
    });
    return {
      ...lastError,
      attemptedProviders,
    };
  }

  const missing = {
    success: false as const,
    error: {
      code: "MISSING_CONFIG" as const,
      message: "No LLM provider is configured.",
    },
    attemptedProviders,
  };
  reportLlmFallbackFailure({
    callType: input.callType,
    businessId: input.businessId,
    conversationId: input.conversationId,
    attemptedProviders,
    error: missing.error,
    mode: "assistant",
  });
  return missing;
}

export async function generateTextWithFallback(
  input: LlmTextInput & { preferredProvider?: AiProvider },
): Promise<LlmFallbackResult> {
  const platformOverrides = await resolveCallTypePlatformOverrides({
    callType: input.callType,
    preferredProvider: input.preferredProvider,
    model: input.model,
    apiKey: input.apiKey,
  });

  const attemptedProviders: AiProvider[] = [];
  let lastError: GeminiServiceResult | null = null;

  for (const provider of await getFallbackProviderOrderForCall({
    preferred: platformOverrides.preferredProvider,
    callType: input.callType,
  })) {
    if (!isProviderReady(provider, platformOverrides.apiKey)) {
      continue;
    }

    attemptedProviders.push(provider);
    const result = await generateText({
      ...input,
      ...platformOverrides,
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

    console.warn(
      "[llm] provider failed",
      JSON.stringify({
        provider,
        model: resolveLlmModel(provider, input.model),
        errorCode: result.error?.code,
        errorMessage: result.error?.message?.slice(0, 300),
      }),
    );
  }

  if (lastError) {
    reportLlmFallbackFailure({
      callType: input.callType,
      businessId: input.businessId,
      conversationId: input.conversationId,
      attemptedProviders,
      error: lastError.success ? null : lastError.error,
      mode: "text",
    });
    return {
      ...lastError,
      attemptedProviders,
    };
  }

  const missing = {
    success: false as const,
    error: {
      code: "MISSING_CONFIG" as const,
      message: "No LLM provider is configured.",
    },
    attemptedProviders,
  };
  reportLlmFallbackFailure({
    callType: input.callType,
    businessId: input.businessId,
    conversationId: input.conversationId,
    attemptedProviders,
    error: missing.error,
    mode: "text",
  });
  return missing;
}
