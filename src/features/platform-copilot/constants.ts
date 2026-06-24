export const PLATFORM_COPILOT_CALENDAR_SETUP_PROMPT =
  "Создай календарь бронирования из базы знаний";

export const PLATFORM_COPILOT_MESSAGES = {
  name: "orzuAI",
  sidebarLabel: "orzuAI",
  tagline: "Автономный помощник платформы",
  openAria: "Open orzuAI assistant",
  closeAria: "Close assistant",
  emptyHint:
    "Спросите что угодно — orzuAI сам поймёт задачу, предложит действия и выполнит их после вашего подтверждения.",
  placeholder: "Например: напиши клиенту Ивану что заказ готов",
  sendAria: "Send message",
  thinking: "Думаю…",
  openPage: "Открыть страницу",
  navigated: "Открываю страницу…",
  confirmAction: "Подтвердить",
  cancelAction: "Отмена",
  actionDone: "Готово",
  actionFailed: "Не удалось выполнить",
  modeChat: "Обычный чат",
  modeFullAccess: "Полный доступ",
  modeChatHint: "Подсказки и навигация",
  modeFullAccessHint: "Контакты, сообщения, база знаний, каналы",
  modeChatConfirmTitle: "Режим: обычный чат",
  modeChatConfirmBody:
    "orzuAI будет отвечать на вопросы и открывать страницы. Для отправки сообщений, изменения базы знаний и других действий переключитесь в «Полный доступ».",
  modeFullAccessConfirmTitle: "Режим: полный доступ",
  modeFullAccessConfirmBody:
    "orzuAI сможет предлагать реальные действия: отправить сообщение клиенту, создать или удалить контакт, изменить базу знаний, включить канал, создать календарь. Каждое действие потребует отдельного подтверждения кнопкой.",
  modeConfirmButton: "Понятно, продолжить",
  requiresFullAccess: "Нужен режим «Полный доступ»",
  examples: [
    "Создай календарь бронирования из базы знаний",
    "Напиши последнему клиенту что мы готовы помочь",
    "Добавь в базу знаний FAQ с сайта",
    "Включи ИИ на WhatsApp",
    "Покажи аналитику",
  ],
} as const;
