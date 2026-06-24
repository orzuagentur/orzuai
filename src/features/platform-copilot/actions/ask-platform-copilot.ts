"use server";

import { z } from "zod";

import { askPlatformCopilot } from "@/services/platform-copilot.service";
import { PLATFORM_COPILOT_MODES } from "@/types/platform-copilot.types";

const historyEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const askPlatformCopilotSchema = z.object({
  question: z.string().trim().min(1).max(800),
  currentPath: z.string().trim().min(1).max(200),
  mode: z.enum(PLATFORM_COPILOT_MODES).default("chat"),
  history: z.array(historyEntrySchema).max(16).optional(),
});

export async function askPlatformCopilotAction(
  input: z.infer<typeof askPlatformCopilotSchema>,
) {
  const parsed = askPlatformCopilotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректный запрос.",
    };
  }

  return askPlatformCopilot(parsed.data);
}
