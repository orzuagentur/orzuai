"use server";

import { z } from "zod";

import { askPlatformCopilot } from "@/services/platform-copilot.service";

const historyEntrySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const askPlatformCopilotSchema = z.object({
  question: z.string().trim().min(1).max(500),
  currentPath: z.string().trim().min(1).max(200),
  history: z.array(historyEntrySchema).max(12).optional(),
});

export async function askPlatformCopilotAction(
  input: z.infer<typeof askPlatformCopilotSchema>,
): Promise<
  | {
      success: true;
      reply: string;
      navigateTo: string | null;
      navigateLabel: string | null;
      autoNavigate: boolean;
    }
  | { success: false; message: string }
> {
  const parsed = askPlatformCopilotSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Некорректный запрос.",
    };
  }

  return askPlatformCopilot(parsed.data);
}
