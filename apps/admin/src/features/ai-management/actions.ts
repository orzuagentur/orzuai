"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AI_PROVIDERS,
  formatPlatformLlmProviderQueue,
  parsePlatformLlmProviderQueue,
  PLATFORM_LLM_PROVIDER_QUEUE_KEY,
  PROVIDER_SECRET_KEYS,
  type AiProvider,
  type AiProviderAvailability,
} from "@/features/ai-management/providers";
import { AI_PLATFORM_STRUCTURE } from "@/features/ai-management/structure";
import type {
  AiManagementOverview,
  AiProviderQueueItem,
} from "@/features/ai-management/types";
import { requirePlatformAdmin } from "@/lib/supabase/server";
import { getSecret, listSecrets, setSecret } from "@orzu/secrets/server";

const queueSchema = z.object({
  providers: z
    .array(z.enum(AI_PROVIDERS))
    .min(1, "Выберите хотя бы одного провайдера.")
    .max(AI_PROVIDERS.length),
});

async function resolveProviderAvailability(
  supabase: Awaited<ReturnType<typeof requirePlatformAdmin>>["supabase"],
): Promise<AiProviderAvailability> {
  const secrets = await listSecrets(supabase);
  const activeKeys = new Set(
    secrets.filter((entry) => entry.isActive).map((entry) => entry.keyName),
  );

  return {
    gemini: activeKeys.has(PROVIDER_SECRET_KEYS.gemini),
    openai: activeKeys.has(PROVIDER_SECRET_KEYS.openai),
    claude: activeKeys.has(PROVIDER_SECRET_KEYS.claude),
  };
}

function buildQueueItems(
  queue: readonly AiProvider[],
  availability: AiProviderAvailability,
): AiProviderQueueItem[] {
  return queue.map((provider, index) => ({
    provider,
    position: index + 1,
    configured: availability[provider],
  }));
}

export async function fetchAiManagementOverviewAction(): Promise<AiManagementOverview> {
  const { supabase } = await requirePlatformAdmin();
  const availability = await resolveProviderAvailability(supabase);
  const raw = await getSecret(supabase, PLATFORM_LLM_PROVIDER_QUEUE_KEY);
  const queue = parsePlatformLlmProviderQueue(raw);

  return {
    providerQueue: buildQueueItems(queue, availability),
    providerAvailability: availability,
    structure: AI_PLATFORM_STRUCTURE,
  };
}

export async function saveAiProviderQueueAction(
  input: z.infer<typeof queueSchema>,
) {
  const parsed = queueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректная очередь.",
    };
  }

  const unique = [...new Set(parsed.data.providers)];

  if (unique.length !== parsed.data.providers.length) {
    return {
      success: false as const,
      message: "Каждый провайдер может быть в очереди только один раз.",
    };
  }

  const { supabase, user } = await requirePlatformAdmin();

  await setSecret(supabase, {
    keyName: PLATFORM_LLM_PROVIDER_QUEUE_KEY,
    value: formatPlatformLlmProviderQueue(unique),
    description:
      "Порядок LLM-провайдеров платформы для всех клиентских ответов.",
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  });

  revalidatePath("/ai-management");
  revalidatePath("/ai-management/queue");
  revalidatePath("/ai-management/structure");

  const availability = await resolveProviderAvailability(supabase);

  return {
    success: true as const,
    queue: buildQueueItems(unique, availability),
  };
}
