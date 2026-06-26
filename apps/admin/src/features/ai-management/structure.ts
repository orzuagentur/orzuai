import type { AiStructureSection } from "@/features/ai-management/types";

export const AI_PLATFORM_STRUCTURE: AiStructureSection[] = [
  {
    id: "reply-flow",
    title: "Как строится ответ клиенту",
    description:
      "Один системный AI-агент на бизнес. Пользователь не выбирает провайдера — используется очередь платформы.",
    cards: [
      {
        id: "inbound",
        title: "1. Входящее сообщение",
        summary: "WhatsApp, Telegram, Email, Website Forms.",
        steps: [
          "Проверка: AI включён на канале и агент активен.",
          "Загрузка профиля ai_assistant_profile (имя, промпт, права CRM).",
          "Контекст: история чата, CRM, база знаний, память диалога.",
        ],
      },
      {
        id: "llm",
        title: "2. Генерация текста",
        summary: "Очередь LLM из раздела «Очередь».",
        steps: [
          "Первый настроенный провайдер в очереди.",
          "При ошибке — следующий провайдер в очереди.",
          "Лимит тарифа проверяется для auto_reply и follow_up.",
        ],
        callTypes: ["auto_reply", "follow_up"],
        limits: "Считаются в лимит AI-ответов тарифа.",
      },
      {
        id: "guard",
        title: "3. Безопасность ответа",
        summary: "sanitizeCustomerFacingReply перед отправкой.",
        steps: [
          "Блокировка утечек system prompt, orchestrator, JSON-схем.",
          "Блокировка prompt injection и внутренних идентификаторов.",
          "При блокировке — fallback-сообщение из профиля агента.",
        ],
      },
      {
        id: "delivery",
        title: "4. Отправка и фон",
        summary: "Текст клиенту, затем CRM в фоне.",
        steps: [
          "Доставка в канал (WhatsApp / Telegram / Email).",
          "Оркестратор: задачи, сделки, заметки, календарь.",
          "Уведомление владельцу при эскалации.",
        ],
        callTypes: ["orchestrator", "crm_plan"],
        limits: "Не считаются в лимит ответов клиенту.",
      },
    ],
  },
  {
    id: "voice",
    title: "Голосовой AI",
    description: "Отдельные вызовы STT и TTS с платформенными ключами.",
    cards: [
      {
        id: "stt",
        title: "Голос → текст",
        summary: "OpenAI Whisper",
        steps: ["Расшифровка входящего voice note.", "Логирование voice_stt."],
        callTypes: ["voice_stt"],
      },
      {
        id: "tts",
        title: "Текст → голос",
        summary: "ElevenLabs",
        steps: [
          "Озвучка ответа агента в WhatsApp / Telegram.",
          "Логирование voice_tts.",
        ],
        callTypes: ["voice_tts"],
      },
    ],
  },
  {
    id: "background",
    title: "Фоновые вызовы ИИ",
    description: "Не видны клиенту, не ограничены тарифом ответов.",
    cards: [
      {
        id: "ops",
        title: "Аналитика и автоматизация",
        summary: "Внутренние задачи платформы.",
        steps: [
          "sentiment, bant — sales automation.",
          "conversation_summary — память диалога.",
          "analytics — ассистент в разделе Analytics.",
        ],
        callTypes: [
          "sentiment",
          "bant",
          "automation",
          "intent",
          "analytics",
          "conversation_summary",
          "other",
        ],
      },
    ],
  },
];
