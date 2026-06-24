"use server";

import { z } from "zod";

import { executePlatformCopilotAction } from "@/services/platform-copilot-executor.service";
import { PLATFORM_COPILOT_MODES } from "@/types/platform-copilot.types";

const executeSchema = z.object({
  mode: z.enum(PLATFORM_COPILOT_MODES),
  action: z.unknown(),
});

export async function executePlatformCopilotActionAction(
  input: z.infer<typeof executeSchema>,
) {
  const parsed = executeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректное действие.",
    };
  }

  return executePlatformCopilotAction(parsed.data);
}
