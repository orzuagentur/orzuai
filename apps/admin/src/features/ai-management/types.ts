import type { AiProvider } from "@/features/ai-management/providers";
import type { AiProviderAvailability } from "@/features/ai-management/providers";

export type AiProviderQueueItem = {
  provider: AiProvider;
  position: number;
  configured: boolean;
};

export type AiStructureCard = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  callTypes?: string[];
  limits?: string;
};

export type AiStructureSection = {
  id: string;
  title: string;
  description: string;
  cards: AiStructureCard[];
};

export type AiManagementOverview = {
  providerQueue: AiProviderQueueItem[];
  providerAvailability: AiProviderAvailability;
  structure: AiStructureSection[];
};
