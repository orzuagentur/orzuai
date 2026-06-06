"use server";

import { z } from "zod";

import { askAnalyticsAssistant } from "@/services/analytics-assistant.service";

const askAnalyticsAssistantSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

export async function askAnalyticsAssistantAction(
  input: z.infer<typeof askAnalyticsAssistantSchema>,
): Promise<
  { success: true; answer: string } | { success: false; message: string }
> {
  const parsed = askAnalyticsAssistantSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid question.",
    };
  }

  return askAnalyticsAssistant(parsed.data);
}
