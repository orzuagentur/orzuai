import type {
  PlatformAiCredentialRecord,
  PlatformAiUseCaseConfigRecord,
  PlatformAiUseCaseDefinition,
} from "@orzu/platform-ai";
import { PLATFORM_AI_USE_CASE_CATEGORIES } from "@orzu/platform-ai";

export type AiCredentialView = PlatformAiCredentialRecord & {
  configured: boolean;
};

export type AiUseCaseCardView = {
  definition: PlatformAiUseCaseDefinition;
  config: PlatformAiUseCaseConfigRecord | null;
  availableProviders: string[];
  availableModels: Array<{ id: string; label: string }>;
  selectedCredentialConfigured: boolean;
};

export type AiPlatformManagementData = {
  credentials: AiCredentialView[];
  useCaseCards: AiUseCaseCardView[];
  categories: typeof PLATFORM_AI_USE_CASE_CATEGORIES;
};
