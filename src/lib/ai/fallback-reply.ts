const FALLBACK_BY_LANGUAGE: Record<string, string> = {
  English:
    "Thank you for your message. We've received it and will get back to you shortly.",
  Russian:
    "Спасибо за сообщение! Мы его получили и скоро ответим.",
  Uzbek:
    "Xabaringiz uchun rahmat. Biz uni oldik va tez orada javob beramiz.",
};

export function resolveAssistantFallbackReplyMessage(input: {
  language: string;
  customMessage?: string | null;
}): string {
  const custom = input.customMessage?.trim();

  if (custom) {
    return custom;
  }

  const language = input.language.trim();

  return (
    FALLBACK_BY_LANGUAGE[language] ??
    FALLBACK_BY_LANGUAGE.English ??
    "Thank you for your message. We've received it and will get back to you shortly."
  );
}
