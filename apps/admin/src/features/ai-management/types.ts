import type { AiProvider } from "@/features/ai-management/providers";
import type { AiProviderAvailability } from "@/features/ai-management/providers";
import type { PlatformPromptKey } from "@orzu/platform-ai";

export type AiProviderQueueItem = {
  provider: AiProvider;
  position: number;
  configured: boolean;
};

export type AiStructureNodeKind =
  | "trigger"
  | "process"
  | "llm"
  | "guard"
  | "delivery"
  | "background"
  | "voice"
  | "usecase"
  | "prompt"
  | "credential";

export type AiStructureLiveStatus = "ready" | "partial" | "missing" | "static";

export type AiStructureUseCaseLive = {
  useCaseId: string;
  label: string;
  provider: string;
  model: string | null;
  credentialName: string | null;
  credentialConfigured: boolean;
  hasConfigRow: boolean;
  status: AiStructureLiveStatus;
};

export type AiStructurePromptLive = {
  promptKey: PlatformPromptKey;
  label: string;
  activeVersion: number | null;
  usageCount: number;
  status: AiStructureLiveStatus;
};

export type AiStructureFlowNode = {
  id: string;
  label: string;
  kind: AiStructureNodeKind;
  summary: string;
  steps: string[];
  callTypes?: string[];
  limits?: string;
  useCaseIds?: string[];
  promptKeys?: PlatformPromptKey[];
  liveStatus?: AiStructureLiveStatus;
  liveDetail?: string;
  useCases?: AiStructureUseCaseLive[];
  prompts?: AiStructurePromptLive[];
};

export type AiStructureFlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type AiStructureFlow = {
  id: string;
  title: string;
  description: string;
  nodes: AiStructureFlowNode[];
  edges: AiStructureFlowEdge[];
};

export type AiStructureLiveSummary = {
  useCasesReady: number;
  useCasesTotal: number;
  credentialsReady: number;
  credentialsTotal: number;
  promptsReady: number;
  promptsTotal: number;
};

export type AiStructureLiveData = {
  flows: AiStructureFlow[];
  summary: AiStructureLiveSummary;
};

export type AiManagementOverview = {
  providerQueue: AiProviderQueueItem[];
  providerAvailability: AiProviderAvailability;
  structure: AiStructureFlow[];
};
