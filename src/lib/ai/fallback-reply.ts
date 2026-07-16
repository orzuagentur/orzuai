import { getPlatformPromptContent } from "@/services/platform-prompts.service";
import { parseGuardFallbackPrompt } from "@orzu/platform-ai";

function getFallbackByLanguage(): Record<string, string> {
  return parseGuardFallbackPrompt(getPlatformPromptContent("guard_fallback"));
}

export function resolveAssistantFallbackReplyMessage(input: {
  language: string;
  customMessage?: string | null;
}): string {
  const custom = input.customMessage?.trim();

  if (custom) {
    return custom;
  }

  const language = input.language.trim();
  const FALLBACK_BY_LANGUAGE = getFallbackByLanguage();

  return (
    FALLBACK_BY_LANGUAGE[language] ??
    FALLBACK_BY_LANGUAGE.English ??
    "Thanks for your message. I am checking this and will help you right here in this chat."
  );
}
