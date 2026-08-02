import { APP_ORIGIN } from "@/constants/app-origin";

/**
 * SEO keyword landing pages ("solutions"). Each page targets a distinct search
 * intent and ships its own unique <title> and meta description so Google shows a
 * different snippet per page. Content is intentionally honest: every capability
 * described here maps to a feature that exists in the product today.
 */

export type SolutionLocale = "en" | "ru";

export const SOLUTION_LOCALES: readonly SolutionLocale[] = ["en", "ru"] as const;

export type SolutionSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type SolutionFaq = {
  question: string;
  answer: string;
};

export type SolutionCopy = {
  /** Primary keyword, used for JSON-LD `about` and internal labels. */
  keyword: string;
  /** Unique <title> for the page (kept < ~60 chars where possible). */
  metaTitle: string;
  /** Unique meta description — the big text shown under the title in Google. */
  metaDescription: string;
  /** On-page H1. */
  h1: string;
  /** Short lead paragraph under the H1. */
  subtitle: string;
  sections: SolutionSection[];
  faqs: SolutionFaq[];
};

export type SolutionPage = {
  slug: string;
  /** Other solution slugs to cross-link (internal linking helps indexing). */
  relatedSlugs: string[];
  copy: Record<SolutionLocale, SolutionCopy>;
};

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "ai-worker",
    relatedSlugs: ["ai-communication", "ai-voice-agent", "whatsapp-crm"],
    copy: {
      en: {
        keyword: "AI worker",
        metaTitle: "AI Worker for Customer Communication | OrzuX",
        metaDescription:
          "OrzuX gives your business an AI worker that replies to customers across WhatsApp, Telegram, web chat and email, uses your knowledge base, and hands off to a human whenever you decide.",
        h1: "An AI worker that handles customer conversations",
        subtitle:
          "Put an AI agent to work across your channels — answering questions, following up, and escalating to your team when needed. You stay in control of what it can and cannot do.",
        sections: [
          {
            heading: "Works from your own knowledge",
            body: [
              "The AI worker answers using the knowledge base you build — documents, website content, FAQs and your business details. It does not invent policies or prices; when it is unsure, it can hand the conversation to a human.",
            ],
            bullets: [
              "Answers common questions instantly, day and night",
              "Uses your uploaded documents and website content",
              "Follows up on conversations so leads do not go cold",
            ],
          },
          {
            heading: "You keep human control",
            body: [
              "AI is not all-or-nothing. You can limit which channels it works on, review its behaviour, and take over any conversation at any time. Every reply lives in the same inbox your team already uses.",
            ],
            bullets: [
              "Turn AI on per channel",
              "Instant human takeover from the shared inbox",
              "Full conversation history kept in one place",
            ],
          },
          {
            heading: "One workspace, not another silo",
            body: [
              "The AI worker sits inside the same platform as your inbox, CRM, calendar and calls — so context follows the customer instead of scattering across tools.",
            ],
          },
        ],
        faqs: [
          {
            question: "Does the AI reply on its own?",
            answer:
              "Yes, when you enable it for a channel. You can restrict it, review its replies, and take over manually at any time.",
          },
          {
            question: "Where does the AI get its answers?",
            answer:
              "From the knowledge base you provide — documents, website content and business details you upload in the dashboard.",
          },
        ],
      },
      ru: {
        keyword: "ИИ работник",
        metaTitle: "ИИ-работник для общения с клиентами | OrzuX",
        metaDescription:
          "OrzuX даёт бизнесу ИИ-работника, который отвечает клиентам в WhatsApp, Telegram, веб-чате и email, использует вашу базу знаний и передаёт диалог человеку, когда вы решите.",
        h1: "ИИ-работник, который ведёт диалоги с клиентами",
        subtitle:
          "Подключите ИИ-агента ко всем каналам — он отвечает на вопросы, ведёт follow-up и передаёт диалог команде при необходимости. Вы полностью управляете тем, что ему разрешено.",
        sections: [
          {
            heading: "Работает на вашей базе знаний",
            body: [
              "ИИ-работник отвечает на основе базы знаний, которую вы создаёте: документы, контент сайта, частые вопросы и данные о бизнесе. Он не выдумывает условия и цены; если не уверен — передаёт диалог человеку.",
            ],
            bullets: [
              "Мгновенно отвечает на частые вопросы, днём и ночью",
              "Использует ваши документы и контент сайта",
              "Ведёт follow-up, чтобы лиды не остывали",
            ],
          },
          {
            heading: "Контроль остаётся за человеком",
            body: [
              "ИИ — это не «всё или ничего». Вы ограничиваете каналы, проверяете его работу и в любой момент берёте диалог на себя. Все ответы — в том же инбоксе, где работает команда.",
            ],
            bullets: [
              "Включение ИИ по каждому каналу отдельно",
              "Мгновенный перехват диалога человеком",
              "Вся история переписки в одном месте",
            ],
          },
          {
            heading: "Одно рабочее пространство, а не ещё один инструмент",
            body: [
              "ИИ-работник находится внутри той же платформы, что и инбокс, CRM, календарь и звонки — контекст следует за клиентом, а не рассыпается по вкладкам.",
            ],
          },
        ],
        faqs: [
          {
            question: "ИИ отвечает самостоятельно?",
            answer:
              "Да, если вы включите его для канала. Можно ограничить его, проверять ответы и в любой момент взять диалог на себя.",
          },
          {
            question: "Откуда ИИ берёт ответы?",
            answer:
              "Из вашей базы знаний — документов, контента сайта и данных о бизнесе, которые вы загружаете в панели.",
          },
        ],
      },
    },
  },
  {
    slug: "ai-communication",
    relatedSlugs: ["ai-worker", "whatsapp-crm", "telegram-crm"],
    copy: {
      en: {
        keyword: "AI communication",
        metaTitle: "AI Communication Platform | Omnichannel Inbox | OrzuX",
        metaDescription:
          "OrzuX is an AI communication platform: one shared inbox for WhatsApp, Telegram, website chat and email, with CRM context and an optional AI agent that replies for you.",
        h1: "AI communication across every customer channel",
        subtitle:
          "Bring WhatsApp, Telegram, website chat and email into one inbox, keep every customer's history in one record, and let AI help your team reply faster.",
        sections: [
          {
            heading: "One inbox for every channel",
            body: [
              "Instead of switching between apps, your team handles all customer messages from a single, shared inbox. Each conversation carries the customer's history so nobody starts from zero.",
            ],
            bullets: [
              "WhatsApp, Telegram, website chat and email in one place",
              "Shared team inbox with assignment and takeover",
              "Customer context attached to every conversation",
            ],
          },
          {
            heading: "AI that speeds up replies",
            body: [
              "Turn on the AI agent to answer routine questions and draft replies, while your team focuses on the conversations that need a human. AI coverage is optional and controllable per channel.",
            ],
          },
          {
            heading: "Communication tied to your CRM and calendar",
            body: [
              "Because messaging, CRM, bookings and calls live in the same platform, a conversation can turn into a contact, a booking or a follow-up without leaving the inbox.",
            ],
          },
        ],
        faqs: [
          {
            question: "Which channels are supported?",
            answer:
              "Channels you connect in Integrations — such as WhatsApp, Telegram, website chat and email. Availability depends on provider setup.",
          },
          {
            question: "Is the AI required?",
            answer:
              "No. The inbox works fully with humans only; AI is an optional layer you enable per channel.",
          },
        ],
      },
      ru: {
        keyword: "ИИ коммуникации",
        metaTitle: "Платформа ИИ-коммуникаций | Общий инбокс | OrzuX",
        metaDescription:
          "OrzuX — платформа ИИ-коммуникаций: единый инбокс для WhatsApp, Telegram, веб-чата и email с контекстом CRM и опциональным ИИ-агентом, который отвечает за вас.",
        h1: "ИИ-коммуникации по всем каналам с клиентами",
        subtitle:
          "Соберите WhatsApp, Telegram, веб-чат и email в одном инбоксе, храните всю историю клиента в одной карточке и позвольте ИИ помогать команде отвечать быстрее.",
        sections: [
          {
            heading: "Один инбокс для всех каналов",
            body: [
              "Вместо переключения между приложениями команда обрабатывает все сообщения в едином общем инбоксе. Каждый диалог хранит историю клиента — никто не начинает с нуля.",
            ],
            bullets: [
              "WhatsApp, Telegram, веб-чат и email в одном месте",
              "Общий инбокс команды с назначением и перехватом",
              "Контекст клиента прикреплён к каждому диалогу",
            ],
          },
          {
            heading: "ИИ ускоряет ответы",
            body: [
              "Включите ИИ-агента, чтобы отвечать на рутинные вопросы и готовить черновики ответов, пока команда занимается диалогами, где нужен человек. Покрытие ИИ — опционально и управляется по каналам.",
            ],
          },
          {
            heading: "Коммуникации связаны с CRM и календарём",
            body: [
              "Так как переписка, CRM, записи и звонки живут в одной платформе, диалог легко превращается в контакт, запись или follow-up прямо из инбокса.",
            ],
          },
        ],
        faqs: [
          {
            question: "Какие каналы поддерживаются?",
            answer:
              "Каналы, которые вы подключаете в Интеграциях — например, WhatsApp, Telegram, веб-чат и email. Доступность зависит от настройки провайдера.",
          },
          {
            question: "ИИ обязателен?",
            answer:
              "Нет. Инбокс полностью работает и без ИИ; ИИ — это опциональный слой, который вы включаете по каналам.",
          },
        ],
      },
    },
  },
  {
    slug: "whatsapp-crm",
    relatedSlugs: ["ai-communication", "ai-worker", "ai-booking"],
    copy: {
      en: {
        keyword: "WhatsApp CRM",
        metaTitle: "WhatsApp Business Inbox & CRM | OrzuX",
        metaDescription:
          "Turn WhatsApp into a sales and support channel with OrzuX: a shared WhatsApp Business inbox, CRM context on every chat, AI replies, and appointment booking — all in one place.",
        h1: "WhatsApp Business inbox with built-in CRM",
        subtitle:
          "Handle WhatsApp conversations as a team, keep every customer's history in CRM, and let AI answer or book appointments — without leaving the chat.",
        sections: [
          {
            heading: "A shared WhatsApp inbox for your team",
            body: [
              "Connect WhatsApp Business and let your whole team reply from one inbox, with assignment, takeover and full history — instead of one phone shared between people.",
            ],
            bullets: [
              "Team access to one WhatsApp Business number",
              "CRM contact and history on every conversation",
              "AI replies you can enable and control",
            ],
          },
          {
            heading: "From chat to booking",
            body: [
              "Because the calendar lives in the same platform, a WhatsApp conversation can turn into a confirmed appointment without switching tools.",
            ],
          },
        ],
        faqs: [
          {
            question: "Do I need WhatsApp Business API access?",
            answer:
              "Yes — you connect your WhatsApp Business provider in Integrations. Setup requirements depend on the provider.",
          },
        ],
      },
      ru: {
        keyword: "WhatsApp CRM",
        metaTitle: "WhatsApp Business инбокс и CRM | OrzuX",
        metaDescription:
          "Превратите WhatsApp в канал продаж и поддержки с OrzuX: общий инбокс WhatsApp Business, контекст CRM в каждом чате, ответы ИИ и запись на приём — в одном месте.",
        h1: "Инбокс WhatsApp Business со встроенной CRM",
        subtitle:
          "Ведите переписку в WhatsApp всей командой, храните историю каждого клиента в CRM и позвольте ИИ отвечать или записывать на приём — прямо в чате.",
        sections: [
          {
            heading: "Общий инбокс WhatsApp для команды",
            body: [
              "Подключите WhatsApp Business и позвольте всей команде отвечать из одного инбокса — с назначением, перехватом и полной историей, вместо одного телефона на всех.",
            ],
            bullets: [
              "Доступ команды к одному номеру WhatsApp Business",
              "Контакт и история CRM в каждом диалоге",
              "Ответы ИИ, которые можно включать и контролировать",
            ],
          },
          {
            heading: "От чата к записи",
            body: [
              "Так как календарь находится в той же платформе, диалог в WhatsApp превращается в подтверждённую запись без переключения инструментов.",
            ],
          },
        ],
        faqs: [
          {
            question: "Нужен ли доступ к WhatsApp Business API?",
            answer:
              "Да — вы подключаете провайдера WhatsApp Business в Интеграциях. Требования к настройке зависят от провайдера.",
          },
        ],
      },
    },
  },
  {
    slug: "ai-voice-agent",
    relatedSlugs: ["ai-worker", "ai-communication", "ai-booking"],
    copy: {
      en: {
        keyword: "AI voice agent",
        metaTitle: "AI Voice Agent for Phone Calls | OrzuX",
        metaDescription:
          "OrzuX includes an AI voice agent that can handle phone calls, speak naturally, and log transcripts next to the customer's history — so no call goes unanswered.",
        h1: "An AI voice agent for your phone calls",
        subtitle:
          "Answer calls with an AI voice agent, capture what was said, and keep transcripts alongside the rest of the customer's conversations.",
        sections: [
          {
            heading: "Calls that don't get missed",
            body: [
              "The AI voice agent can pick up calls, respond naturally, and capture the details — useful for after-hours, overflow, or routine questions.",
            ],
            bullets: [
              "Natural spoken responses",
              "Call transcripts saved with the customer record",
              "Voice sits in the same workspace as chat and CRM",
            ],
          },
          {
            heading: "Part of one customer record",
            body: [
              "Calls are not a separate silo. Transcripts and outcomes live next to the customer's messages, so your team has full context.",
            ],
          },
        ],
        faqs: [
          {
            question: "Does it record and transcribe calls?",
            answer:
              "Calls can be transcribed and stored with the conversation history, depending on your configuration.",
          },
        ],
      },
      ru: {
        keyword: "ИИ голосовой агент",
        metaTitle: "ИИ голосовой агент для звонков | OrzuX",
        metaDescription:
          "OrzuX включает ИИ голосового агента, который принимает звонки, говорит естественно и сохраняет транскрипты рядом с историей клиента — ни один звонок не останется без ответа.",
        h1: "ИИ голосовой агент для ваших звонков",
        subtitle:
          "Отвечайте на звонки с помощью ИИ голосового агента, фиксируйте сказанное и храните транскрипты рядом с остальными диалогами клиента.",
        sections: [
          {
            heading: "Звонки, которые не теряются",
            body: [
              "ИИ голосовой агент может принимать звонки, естественно отвечать и фиксировать детали — удобно для нерабочих часов, пиковой нагрузки и рутинных вопросов.",
            ],
            bullets: [
              "Естественные голосовые ответы",
              "Транскрипты звонков сохраняются в карточке клиента",
              "Голос — в том же пространстве, что чат и CRM",
            ],
          },
          {
            heading: "Часть единой карточки клиента",
            body: [
              "Звонки — не отдельный силос. Транскрипты и итоги хранятся рядом с сообщениями клиента, поэтому у команды есть полный контекст.",
            ],
          },
        ],
        faqs: [
          {
            question: "Записываются и расшифровываются ли звонки?",
            answer:
              "Звонки могут расшифровываться и сохраняться вместе с историей диалога — в зависимости от вашей настройки.",
          },
        ],
      },
    },
  },
  {
    slug: "ai-booking",
    relatedSlugs: ["ai-worker", "whatsapp-crm", "ai-communication"],
    copy: {
      en: {
        keyword: "AI appointment booking",
        metaTitle: "AI Appointment Booking & Calendar | OrzuX",
        metaDescription:
          "OrzuX turns conversations into booked appointments: a built-in calendar, public booking pages for your customers, and AI that can schedule directly from chat.",
        h1: "AI-assisted appointment booking",
        subtitle:
          "Let customers book from a public page or straight from a conversation, and keep every appointment on a calendar that lives next to your inbox and CRM.",
        sections: [
          {
            heading: "Booking that fits into the conversation",
            body: [
              "Share a public booking page, or let the AI agent schedule appointments during a chat. Bookings land on the same calendar your team manages.",
            ],
            bullets: [
              "Public booking pages for your customers",
              "Calendar in the same workspace as chat and CRM",
              "AI can schedule directly from a conversation",
            ],
          },
          {
            heading: "Fewer no-shows, less back-and-forth",
            body: [
              "Because booking, messaging and reminders are in one platform, follow-ups and confirmations stay tied to the customer.",
            ],
          },
        ],
        faqs: [
          {
            question: "Can customers book without an account?",
            answer:
              "Yes — you can share a public booking page for a business so customers book without signing up.",
          },
        ],
      },
      ru: {
        keyword: "ИИ запись на приём",
        metaTitle: "ИИ-запись на приём и календарь | OrzuX",
        metaDescription:
          "OrzuX превращает диалоги в записи: встроенный календарь, публичные страницы записи для клиентов и ИИ, который планирует встречи прямо из чата.",
        h1: "Запись на приём с помощью ИИ",
        subtitle:
          "Позвольте клиентам записываться с публичной страницы или прямо из диалога и держите все записи в календаре рядом с инбоксом и CRM.",
        sections: [
          {
            heading: "Запись прямо в диалоге",
            body: [
              "Поделитесь публичной страницей записи или позвольте ИИ-агенту планировать встречи во время чата. Записи попадают в тот же календарь, которым управляет команда.",
            ],
            bullets: [
              "Публичные страницы записи для клиентов",
              "Календарь в одном пространстве с чатом и CRM",
              "ИИ планирует запись прямо из диалога",
            ],
          },
          {
            heading: "Меньше неявок и лишней переписки",
            body: [
              "Так как запись, переписка и напоминания в одной платформе, follow-up и подтверждения остаются привязаны к клиенту.",
            ],
          },
        ],
        faqs: [
          {
            question: "Могут ли клиенты записываться без аккаунта?",
            answer:
              "Да — можно поделиться публичной страницей записи бизнеса, чтобы клиенты записывались без регистрации.",
          },
        ],
      },
    },
  },
  {
    slug: "telegram-crm",
    relatedSlugs: ["ai-communication", "whatsapp-crm", "ai-worker"],
    copy: {
      en: {
        keyword: "Telegram CRM",
        metaTitle: "Telegram Inbox & CRM for Business | OrzuX",
        metaDescription:
          "Manage Telegram customer chats as a team with OrzuX: a shared Telegram inbox, CRM context on every conversation, and an optional AI agent that replies for you.",
        h1: "Telegram customer service with built-in CRM",
        subtitle:
          "Handle Telegram conversations from a shared inbox, keep customer history in CRM, and let AI help with routine replies.",
        sections: [
          {
            heading: "Telegram as a real support channel",
            body: [
              "Connect Telegram and let your team reply from the same inbox as your other channels, with history and assignment built in.",
            ],
            bullets: [
              "Shared Telegram inbox for the team",
              "CRM context on every conversation",
              "Optional AI replies you control",
            ],
          },
        ],
        faqs: [
          {
            question: "Can AI reply on Telegram?",
            answer:
              "Yes — you can enable the AI agent per channel, including Telegram, and take over manually anytime.",
          },
        ],
      },
      ru: {
        keyword: "Telegram CRM",
        metaTitle: "Telegram инбокс и CRM для бизнеса | OrzuX",
        metaDescription:
          "Ведите чаты клиентов в Telegram всей командой с OrzuX: общий инбокс Telegram, контекст CRM в каждом диалоге и опциональный ИИ-агент, который отвечает за вас.",
        h1: "Поддержка клиентов в Telegram со встроенной CRM",
        subtitle:
          "Обрабатывайте диалоги в Telegram из общего инбокса, храните историю клиента в CRM и позвольте ИИ помогать с рутинными ответами.",
        sections: [
          {
            heading: "Telegram как полноценный канал поддержки",
            body: [
              "Подключите Telegram и позвольте команде отвечать из того же инбокса, что и другие каналы — с историей и назначением.",
            ],
            bullets: [
              "Общий инбокс Telegram для команды",
              "Контекст CRM в каждом диалоге",
              "Опциональные ответы ИИ под вашим контролем",
            ],
          },
        ],
        faqs: [
          {
            question: "Может ли ИИ отвечать в Telegram?",
            answer:
              "Да — ИИ-агента можно включить по каналам, включая Telegram, и в любой момент взять диалог на себя.",
          },
        ],
      },
    },
  },
];

const SOLUTION_MAP = new Map(SOLUTION_PAGES.map((page) => [page.slug, page]));

export function getSolutionPage(slug: string): SolutionPage | undefined {
  return SOLUTION_MAP.get(slug);
}

export function getSolutionSlugs(): string[] {
  return SOLUTION_PAGES.map((page) => page.slug);
}

export function resolveSolutionLocale(
  value: string | string[] | undefined,
): SolutionLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "ru" ? "ru" : "en";
}

/** Canonical URL for a solution page in a given locale. */
export function buildSolutionUrl(slug: string, locale: SolutionLocale): string {
  const base = `${APP_ORIGIN}/solutions/${slug}`;
  return locale === "en" ? base : `${base}?lang=${locale}`;
}

/** hreflang alternates (en/ru + x-default) for a solution page. */
export function buildSolutionHreflangAlternates(
  slug: string,
): Record<string, string> {
  return {
    en: buildSolutionUrl(slug, "en"),
    ru: buildSolutionUrl(slug, "ru"),
    "x-default": buildSolutionUrl(slug, "en"),
  };
}

/** JSON-LD for a solution page: Service + FAQ + Breadcrumb. */
export function buildSolutionStructuredData(
  page: SolutionPage,
  locale: SolutionLocale,
) {
  const copy = page.copy[locale];
  const url = buildSolutionUrl(page.slug, locale);

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: copy.h1,
    serviceType: copy.keyword,
    description: copy.metaDescription,
    url,
    inLanguage: locale,
    provider: {
      "@type": "Organization",
      name: "OrzuX",
      url: APP_ORIGIN,
    },
    areaServed: "Global",
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: copy.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "OrzuX",
        item: APP_ORIGIN,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: copy.h1,
        item: url,
      },
    ],
  };

  return copy.faqs.length > 0 ? [service, faq, breadcrumb] : [service, breadcrumb];
}
