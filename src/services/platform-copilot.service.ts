import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { planPlatformCopilotActions } from "@/services/platform-copilot-agent.service";
import type {
  CopilotProposedAction,
  PlatformCopilotMode,
} from "@/types/platform-copilot.types";

export type PlatformCopilotHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export async function askPlatformCopilot(input: {
  question: string;
  currentPath: string;
  mode: PlatformCopilotMode;
  history?: PlatformCopilotHistoryEntry[];
}): Promise<
  | {
      success: true;
      reply: string;
      quickReplies: string[];
      actions: CopilotProposedAction[];
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

  if (question.length > 800) {
    return { success: false, message: "Вопрос слишком длинный." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Бизнес не найден." };
  }

  const plan = await planPlatformCopilotActions({
    businessId: business.id,
    question,
    currentPath: input.currentPath,
    mode: input.mode,
    history: input.history,
  });

  if (!plan.success) {
    return { success: false, message: plan.message };
  }

  const navigateAction = (plan.data.actions ?? []).find(
    (action) => action.type === "navigate",
  );

  return {
    success: true,
    reply: plan.data.reply,
    quickReplies: plan.data.quickReplies ?? [],
    actions: plan.data.actions ?? [],
    navigateTo: navigateAction?.params.path ?? null,
    navigateLabel: navigateAction?.label ?? null,
    autoNavigate: false,
  };
}
