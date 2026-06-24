import { PLATFORM_COPILOT_CALENDAR_SETUP_PROMPT } from "@/features/platform-copilot/constants";

export function isCalendarSetupFromKnowledgeRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const exactPrompt = PLATFORM_COPILOT_CALENDAR_SETUP_PROMPT.toLowerCase();

  if (normalized === exactPrompt) {
    return true;
  }

  const englishPhrases = [
    "create booking calendar from knowledge",
    "setup calendar from knowledge base",
    "generate calendar from knowledge base",
  ];

  if (englishPhrases.some((phrase) => normalized.includes(phrase))) {
    return true;
  }

  const mentionsCalendar =
    /календар|calendar|бронир|booking|reservation/.test(normalized);
  const mentionsKnowledge =
    /база знаний|базы знаний|knowledge base|knowledge/.test(normalized);
  const mentionsResources =
    /номера|столик|мастер|комнат|room|table|staff|barber|hotel|restaurant/.test(
      normalized,
    );
  const mentionsCreate =
    /создай|создать|настрой|настроить|сгенерир|create|setup|generate|build/.test(
      normalized,
    );

  if (mentionsCalendar && mentionsKnowledge && mentionsCreate) {
    return true;
  }

  return mentionsCreate && mentionsCalendar && mentionsResources;
}

export function buildCalendarSetupSuccessReply(input: {
  businessTypeLabel: string;
  resourceCount: number;
  resourceNames: string[];
}): string {
  const preview = input.resourceNames.slice(0, 8).join(", ");
  const more =
    input.resourceNames.length > 8
      ? ` и ещё ${input.resourceNames.length - 8}`
      : "";

  return [
    `Готово! Проанализировал базу знаний и создал календарь для «${input.businessTypeLabel}».`,
    `Добавлено ${input.resourceCount} ресурсов: ${preview}${more}.`,
    "ИИ-агент будет использовать их при бронировании для клиентов.",
    "Откройте календарь, чтобы просмотреть список и подключить Google Calendar, если ещё не подключён.",
  ].join("\n\n");
}
