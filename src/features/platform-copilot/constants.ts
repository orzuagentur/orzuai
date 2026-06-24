export const PLATFORM_COPILOT_CALENDAR_SETUP_PROMPT =
  "Создай календарь бронирования из базы знаний (номера, столики, мастера)";

export const PLATFORM_COPILOT_MESSAGES = {
  name: "orzuAI",
  sidebarLabel: "orzuAI",
  tagline: "Platform assistant",
  openAria: "Open orzuAI assistant",
  closeAria: "Close assistant",
  emptyHint:
    "Спросите, как пользоваться OrzuX — или создайте календарь из базы знаний одним запросом.",
  placeholder: "Что вы хотите сделать?",
  sendAria: "Send message",
  thinking: "Анализирую базу знаний…",
  openPage: "Открыть страницу",
  navigated: "Открываю страницу…",
  calendarSetupThinking: "Создаю календарь из базы знаний…",
  examples: [
    PLATFORM_COPILOT_CALENDAR_SETUP_PROMPT,
    "How do I connect WhatsApp?",
    "Where can I reply to customer messages?",
    "How do I set up the AI agent?",
    "Where can I view analytics?",
  ],
} as const;
