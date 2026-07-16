"use server";

import { buildLiveAiStructure } from "@/features/ai-management/build-live-structure";
import { fetchAiPlatformManagementAction } from "@/features/ai-management/platform-actions";
import type { AiStructureLiveData } from "@/features/ai-management/types";
import { fetchPlatformPromptsAction } from "@/features/platform-prompts/actions";

export async function fetchAiStructureLiveAction(): Promise<AiStructureLiveData> {
  const [platform, prompts] = await Promise.all([
    fetchAiPlatformManagementAction(),
    fetchPlatformPromptsAction(),
  ]);

  return buildLiveAiStructure({
    useCaseCards: platform.useCaseCards,
    credentials: platform.credentials,
    promptGroups: prompts.groups,
  });
}
