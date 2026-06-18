import { z } from "zod";

import { DASHBOARD_ROUTES } from "@/constants/routes";

const ALLOWED_PATH_PREFIXES = [
  DASHBOARD_ROUTES.overview,
  DASHBOARD_ROUTES.onboarding,
  DASHBOARD_ROUTES.chats,
  DASHBOARD_ROUTES.contacts,
  DASHBOARD_ROUTES.aiAssistant,
  DASHBOARD_ROUTES.automations,
  DASHBOARD_ROUTES.analytics,
  DASHBOARD_ROUTES.integrations,
  DASHBOARD_ROUTES.knowledgeBase,
  DASHBOARD_ROUTES.settings,
  DASHBOARD_ROUTES.subscription,
  DASHBOARD_ROUTES.marketplace,
] as const;

export const platformCopilotResponseSchema = z.object({
  reply: z.string().trim().min(1),
  navigateTo: z.string().trim().nullable().optional(),
  navigateLabel: z.string().trim().nullable().optional(),
  autoNavigate: z.boolean().optional(),
});

export type PlatformCopilotResponse = z.infer<typeof platformCopilotResponseSchema>;

export function isAllowedCopilotPath(path: string): boolean {
  if (!path.startsWith("/dashboard")) {
    return false;
  }

  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function parsePlatformCopilotResponse(raw: string): PlatformCopilotResponse {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      reply: trimmed,
      navigateTo: null,
      navigateLabel: null,
      autoNavigate: false,
    };
  }

  try {
    const parsed = platformCopilotResponseSchema.parse(JSON.parse(jsonMatch[0]));
    const navigateTo =
      parsed.navigateTo && isAllowedCopilotPath(parsed.navigateTo)
        ? parsed.navigateTo
        : null;

    return {
      reply: parsed.reply,
      navigateTo,
      navigateLabel: parsed.navigateLabel ?? null,
      autoNavigate: Boolean(parsed.autoNavigate && navigateTo),
    };
  } catch {
    return {
      reply: trimmed,
      navigateTo: null,
      navigateLabel: null,
      autoNavigate: false,
    };
  }
}
