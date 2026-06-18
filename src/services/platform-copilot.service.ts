import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import {
  buildPlatformCopilotPrompt,
  buildPlatformCopilotSystemInstruction,
} from "@/lib/platform-copilot/prompts";
import { parsePlatformCopilotResponse } from "@/lib/platform-copilot/parse-copilot-response";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateText } from "@/services/llm.service";

export type PlatformCopilotHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export async function askPlatformCopilot(input: {
  question: string;
  currentPath: string;
  history?: PlatformCopilotHistoryEntry[];
}): Promise<
  | {
      success: true;
      reply: string;
      navigateTo: string | null;
      navigateLabel: string | null;
      autoNavigate: boolean;
    }
  | { success: false; message: string }
> {
  const question = input.question.trim();

  if (!question) {
    return { success: false, message: "Введите вопрос." };
  }

  if (question.length > 500) {
    return { success: false, message: "Вопрос слишком длинный." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Бизнес не найден." };
  }

  const history = (input.history ?? []).slice(-6);

  const aiResult = await generateText({
    businessId: business.id,
    prompt: buildPlatformCopilotPrompt({
      question,
      currentPath: input.currentPath,
      history,
    }),
    systemInstruction: buildPlatformCopilotSystemInstruction(),
  });

  if (!aiResult.success) {
    return { success: false, message: aiResult.error.message };
  }

  const parsed = parsePlatformCopilotResponse(aiResult.data.text);

  return {
    success: true,
    reply: parsed.reply,
    navigateTo: parsed.navigateTo ?? null,
    navigateLabel: parsed.navigateLabel ?? null,
    autoNavigate: parsed.autoNavigate ?? false,
  };
}
