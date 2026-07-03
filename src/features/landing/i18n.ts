export const LANDING_LOCALES = ["en", "ru", "uz"] as const;

export type LandingLocale = (typeof LANDING_LOCALES)[number];

export const LANDING_LOCALE_LABELS: Record<LandingLocale, string> = {
  en: "EN",
  ru: "RU",
  uz: "UZ",
};

export type LandingChannelId =
  | "whatsapp"
  | "instagram"
  | "telegram"
  | "website_forms"
  | "voice"
  | "email"
  | "google_calendar";

export type LandingIconKey =
  | "ai"
  | "analytics"
  | "api"
  | "automations"
  | "calendar"
  | "chat"
  | "company"
  | "crm"
  | "docs"
  | "enterprise"
  | "guardrails"
  | "inbox"
  | "integrations"
  | "phone"
  | "pricing"
  | "resources"
  | "security"
  | "spark"
  | "users"
  | "workflow";

export type LandingFaqItem = {
  question: string;
  answer: string;
};

export type LandingMegaItem = {
  title: string;
  description: string;
  href: string;
  icon: LandingIconKey;
};

export type LandingMegaPanel = {
  title: string;
  description: string;
  columns: {
    title: string;
    items: LandingMegaItem[];
  }[];
  featured: {
    title: string;
    description: string;
    cta: string;
    href: string;
  };
};

export type LandingProductCard = {
  id: string;
  title: string;
  description: string;
  metric: string;
  detail: string;
  icon: LandingIconKey;
};

export type LandingSolutionCard = {
  title: string;
  description: string;
  outcomes: string[];
};

export type LandingLiveEvent = {
  id: string;
  channel: LandingChannelId;
  label: string;
  customer: string;
  message: string;
  aiReply: string;
  intent: string;
  deal: string;
  nextStep: string;
  callStatus: string;
  calendar: string;
  metric: string;
};

export type LandingCopy = {
  meta: {
    title: string;
    description: string;
  };
  skipToContent: string;
  header: {
    login: string;
    startFree: string;
    bookDemo: string;
    openMenu: string;
    closeMenu: string;
    nav: {
      products: string;
      services: string;
      solutions: string;
      enterprise: string;
      developers: string;
      resources: string;
      pricing: string;
      documentation: string;
      company: string;
    };
    mega: Record<
      "products" | "solutions" | "developers" | "resources",
      LandingMegaPanel
    >;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    badge: string;
    metrics: {
      value: string;
      label: string;
    }[];
  };
  trust: {
    eyebrow: string;
    items: string[];
  };
  liveDemo: {
    title: string;
    subtitle: string;
    status: string;
    inbox: string;
    aiResponse: string;
    crm: string;
    voice: string;
    calendar: string;
    actions: string;
    guardrailTitle: string;
    guardrailText: string;
    synced: string;
    events: LandingLiveEvent[];
  };
  platform: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: LandingProductCard[];
  };
  solutions: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: LandingSolutionCard[];
  };
  enterprise: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pillars: LandingProductCard[];
  };
  platformStrip: {
    title: string;
    subtitle: string;
    liveLabel: string;
  };
  architecture: {
    eyebrow: string;
    title: string;
    subtitle: string;
    nodes: {
      id: string;
      label: string;
      caption: string;
    }[];
  };
  faq: {
    title: string;
    subtitle: string;
    items: LandingFaqItem[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    startCta: string;
    freeLabel: string;
    perMonth: string;
    highlight: string;
    note: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  auth: {
    modalTitle: string;
    modalDescription: string;
    signIn: string;
    createAccount: string;
    orEmail: string;
  };
  footer: {
    tagline: string;
    columns: {
      title: string;
      links: {
        label: string;
        href: string;
      }[];
    }[];
  };
  microSignals: {
    voiceLines: readonly [string, string, string];
    incoming: readonly [
      { channel: "whatsapp"; text: string },
      { channel: "instagram"; text: string },
      { channel: "telegram"; text: string },
      { channel: "website_forms"; text: string },
    ];
  };
  platformServices: readonly {
    id: string;
    label: string;
    hint: string;
    liveLine: string;
  }[];
};

export function isLandingLocale(value: string | null | undefined): value is LandingLocale {
  return value === "en" || value === "ru" || value === "uz";
}

export function resolveLandingLocale(
  value: string | null | undefined,
): LandingLocale {
  return isLandingLocale(value) ? value : "en";
}

const EN: LandingCopy = {
  meta: {
    title: "OrzuX | Enterprise AI Communication Platform",
    description:
      "OrzuX unifies AI inbox, voice, CRM, calendar, automations, analytics, and customer channels in one enterprise-ready workspace.",
  },
  skipToContent: "Skip to main content",
  header: {
    login: "Log in",
    startFree: "Start free",
    bookDemo: "Book a demo",
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    nav: {
      products: "Products",
      services: "Services",
      solutions: "Solutions",
      enterprise: "Enterprise",
      developers: "Developers",
      resources: "Resources",
      pricing: "Pricing",
      documentation: "Documentation",
      company: "Company",
    },
    mega: {
      products: {
        title: "Products",
        description: "A complete AI operating layer for customer communication.",
        columns: [
          {
            title: "Engage",
            items: [
              {
                title: "Unified Inbox",
                description: "WhatsApp, Instagram, Telegram, forms, email, and SMS in one queue.",
                href: "#platform",
                icon: "inbox",
              },
              {
                title: "Voice AI",
                description: "AI answers calls, qualifies intent, and hands off with context.",
                href: "#platform",
                icon: "phone",
              },
              {
                title: "AI Assistant",
                description: "Agents grounded in your knowledge base and channel history.",
                href: "#platform",
                icon: "ai",
              },
            ],
          },
          {
            title: "Operate",
            items: [
              {
                title: "CRM Pipeline",
                description: "Contacts, deals, tasks, notes, and customer memory.",
                href: "#platform",
                icon: "crm",
              },
              {
                title: "Calendar & Booking",
                description: "Availability, public booking pages, reminders, and Google sync.",
                href: "#platform",
                icon: "calendar",
              },
              {
                title: "Automations",
                description: "Follow-ups, lead routing, SLA alerts, and lifecycle workflows.",
                href: "#platform",
                icon: "automations",
              },
            ],
          },
          {
            title: "Measure",
            items: [
              {
                title: "AI Analytics",
                description: "Channel performance, AI usage, response quality, and ROI signals.",
                href: "#enterprise",
                icon: "analytics",
              },
              {
                title: "Integrations",
                description: "Official provider connections with provider-owned credentials.",
                href: "#architecture",
                icon: "integrations",
              },
            ],
          },
        ],
        featured: {
          title: "See the platform live",
          description: "Watch one customer message become a reply, deal, call, and booking.",
          cta: "Open showcase",
          href: "#live-platform",
        },
      },
      solutions: {
        title: "Solutions",
        description: "Purpose-built flows for teams that live close to the customer.",
        columns: [
          {
            title: "Revenue teams",
            items: [
              {
                title: "Sales Development",
                description: "Qualify leads, answer objections, and book meetings around the clock.",
                href: "#solutions",
                icon: "spark",
              },
              {
                title: "Local Services",
                description: "Turn calls, DMs, and forms into confirmed appointments.",
                href: "#solutions",
                icon: "calendar",
              },
            ],
          },
          {
            title: "Operations",
            items: [
              {
                title: "Customer Support",
                description: "Resolve common questions and route sensitive cases to humans.",
                href: "#solutions",
                icon: "chat",
              },
              {
                title: "Agencies",
                description: "Manage multiple client workspaces with clear usage and outcomes.",
                href: "#solutions",
                icon: "users",
              },
            ],
          },
        ],
        featured: {
          title: "Built for real workflows",
          description: "Not a chatbot layer. OrzuX updates the business system behind every conversation.",
          cta: "Explore use cases",
          href: "#solutions",
        },
      },
      developers: {
        title: "Developers",
        description: "Connect OrzuX to the systems your business already trusts.",
        columns: [
          {
            title: "Build",
            items: [
              {
                title: "API & Webhooks",
                description: "Route events, sync conversations, and connect internal tools.",
                href: "#architecture",
                icon: "api",
              },
              {
                title: "Documentation",
                description: "Implementation guidance for integrations and platform setup.",
                href: "#architecture",
                icon: "docs",
              },
            ],
          },
          {
            title: "Control",
            items: [
              {
                title: "Security Model",
                description: "Business-scoped data, signed webhooks, and provider keys.",
                href: "#enterprise",
                icon: "security",
              },
              {
                title: "Guardrails",
                description: "Human handoff, reply controls, and knowledge-grounded responses.",
                href: "#enterprise",
                icon: "guardrails",
              },
            ],
          },
        ],
        featured: {
          title: "Production-ready architecture",
          description: "Designed for teams that need automation without losing operational control.",
          cta: "View architecture",
          href: "#architecture",
        },
      },
      resources: {
        title: "Resources",
        description: "Proof, guidance, and answers for evaluating OrzuX.",
        columns: [
          {
            title: "Learn",
            items: [
              {
                title: "Platform Guide",
                description: "How the AI communication workspace comes together.",
                href: "#architecture",
                icon: "resources",
              },
              {
                title: "Pricing",
                description: "Start free, then scale by channels, seats, voice, and automation.",
                href: "#pricing",
                icon: "pricing",
              },
            ],
          },
          {
            title: "Company",
            items: [
              {
                title: "About OrzuX",
                description: "A focused platform for customer-facing AI operations.",
                href: "#footer",
                icon: "company",
              },
              {
                title: "FAQ",
                description: "Channels, AI setup, handoff, and provider billing.",
                href: "#faq",
                icon: "docs",
              },
            ],
          },
        ],
        featured: {
          title: "Evaluation checklist",
          description: "Use the page to verify channels, AI control, CRM flow, booking, and analytics.",
          cta: "Review FAQ",
          href: "#faq",
        },
      },
    },
  },
  hero: {
    eyebrow: "Enterprise AI communication platform",
    title: "One AI workspace for every customer conversation.",
    subtitle:
      "OrzuX answers messages and calls, updates CRM, books appointments, triggers follow-ups, and keeps humans in control across WhatsApp, Instagram, Telegram, voice, forms, email, and calendar.",
    primaryCta: "Start free",
    secondaryCta: "Book a demo",
    badge: "Live platform preview",
    metrics: [
      { value: "7", label: "customer channels" },
      { value: "24/7", label: "AI response coverage" },
      { value: "1", label: "shared customer record" },
    ],
  },
  trust: {
    eyebrow: "Designed for high-touch teams",
    items: [
      "Sales",
      "Support",
      "Clinics",
      "Agencies",
      "Real estate",
      "Hospitality",
      "Local services",
      "Education",
    ],
  },
  liveDemo: {
    title: "OrzuX command center",
    subtitle: "AI replies, creates CRM context, handles calls, books time, and syncs the team.",
    status: "Live system",
    inbox: "Inbox",
    aiResponse: "AI response",
    crm: "CRM",
    voice: "Voice",
    calendar: "Calendar",
    actions: "Actions",
    guardrailTitle: "AI guardrail",
    guardrailText:
      "Knowledge-grounded reply, channel policy checked, human handoff available.",
    synced: "Synced",
    events: [
      {
        id: "booking",
        channel: "whatsapp",
        label: "WhatsApp lead",
        customer: "Amina R.",
        message: "Can I book a consultation tomorrow after 3?",
        aiReply: "Yes. I found 3:30 and 4:15. I can reserve either slot and send the confirmation.",
        intent: "Booking request",
        deal: "Consultation - qualified",
        nextStep: "Send confirmation",
        callStatus: "No call needed",
        calendar: "3:30 PM reserved",
        metric: "12 sec reply",
      },
      {
        id: "pricing",
        channel: "instagram",
        label: "Instagram DM",
        customer: "Nova Studio",
        message: "Do you have monthly plans for teams?",
        aiReply: "Yes. Starter covers one channel. Pro adds voice AI, automations, and advanced analytics.",
        intent: "Pricing question",
        deal: "Team plan - warm",
        nextStep: "Share Pro plan",
        callStatus: "Follow-up queued",
        calendar: "Demo link ready",
        metric: "Deal created",
      },
      {
        id: "voice",
        channel: "voice",
        label: "AI phone call",
        customer: "+49 152 8840",
        message: "Caller asks for availability and payment options.",
        aiReply: "AI is speaking naturally, checking business hours, and summarizing the call for the team.",
        intent: "Appointment + payment",
        deal: "Inbound call - new",
        nextStep: "SMS summary",
        callStatus: "AI answering",
        calendar: "Open slots checked",
        metric: "Voice active",
      },
      {
        id: "form",
        channel: "website_forms",
        label: "Website form",
        customer: "Mira Clinic",
        message: "New enterprise inquiry from the website form.",
        aiReply: "Lead enriched, routed to the right workspace, and assigned with recommended next action.",
        intent: "Enterprise inquiry",
        deal: "Enterprise - priority",
        nextStep: "Assign owner",
        callStatus: "Manager notified",
        calendar: "Discovery call proposed",
        metric: "SLA protected",
      },
    ],
  },
  platform: {
    eyebrow: "Product platform",
    title: "Everything behind the conversation is connected.",
    subtitle:
      "The page opens with the product because OrzuX sells by showing the operating system, not by promising one more chatbot.",
    cards: [
      {
        id: "inbox",
        title: "Unified Inbox",
        description: "Every customer channel enters one prioritized workspace with assignment, notes, and human handoff.",
        metric: "All channels",
        detail: "One queue",
        icon: "inbox",
      },
      {
        id: "assistant",
        title: "OrzuX Assistant",
        description: "AI replies with business knowledge, remembers customer context, and respects channel controls.",
        metric: "Grounded AI",
        detail: "Knowledge-aware",
        icon: "ai",
      },
      {
        id: "voice",
        title: "Voice AI",
        description: "Answer calls, summarize outcomes, trigger SMS, and escalate to a human when needed.",
        metric: "Always on",
        detail: "Phone-ready",
        icon: "phone",
      },
      {
        id: "crm",
        title: "CRM & Deals",
        description: "Turn replies into contacts, pipeline updates, tasks, and next-best actions.",
        metric: "Auto-updated",
        detail: "No copy-paste",
        icon: "crm",
      },
      {
        id: "calendar",
        title: "Calendar Booking",
        description: "Create booking pages, check availability, send reminders, and sync with Google Calendar.",
        metric: "Synced",
        detail: "Booking engine",
        icon: "calendar",
      },
      {
        id: "analytics",
        title: "AI Analytics",
        description: "Measure volume, usage, quality, channel mix, response speed, and revenue signals.",
        metric: "Observable",
        detail: "AI ops",
        icon: "analytics",
      },
    ],
  },
  solutions: {
    eyebrow: "Solutions",
    title: "Built for teams where every missed reply costs revenue.",
    subtitle:
      "OrzuX focuses on the workflows that need fast answers, clean handoff, and business actions after the conversation.",
    cards: [
      {
        title: "Sales and lead qualification",
        description: "Respond instantly to inbound demand and move serious buyers into CRM before interest cools.",
        outcomes: ["Qualify intent", "Create deals", "Book demos"],
      },
      {
        title: "Support and service operations",
        description: "Resolve repetitive questions while humans keep control of sensitive or high-value cases.",
        outcomes: ["Grounded replies", "Handoff rules", "Conversation history"],
      },
      {
        title: "Booking-heavy businesses",
        description: "Let AI coordinate appointment requests across DMs, calls, forms, and calendar availability.",
        outcomes: ["Public booking pages", "Reminders", "Google sync"],
      },
    ],
  },
  enterprise: {
    eyebrow: "Enterprise readiness",
    title: "Autonomy with supervision, context, and control.",
    subtitle:
      "Enterprise AI only works when teams can understand what happened, control how agents act, and keep provider relationships clear.",
    pillars: [
      {
        id: "guardrails",
        title: "Human handoff",
        description: "AI can pause, escalate, or let operators reply manually from the same customer record.",
        metric: "Controlled",
        detail: "Handoff built in",
        icon: "guardrails",
      },
      {
        id: "security",
        title: "Business-scoped data",
        description: "Workspaces, channels, keys, conversations, and automations stay separated by business context.",
        metric: "Scoped",
        detail: "Tenant-aware",
        icon: "security",
      },
      {
        id: "observability",
        title: "Operational visibility",
        description: "Managers can monitor AI volume, quality signals, queue health, and channel outcomes.",
        metric: "Measurable",
        detail: "AI ops",
        icon: "analytics",
      },
    ],
  },
  platformStrip: {
    title: "OrzuX Platform",
    subtitle: "Official integrations - live modules",
    liveLabel: "Live",
  },
  architecture: {
    eyebrow: "Architecture",
    title: "From channel event to business outcome.",
    subtitle:
      "OrzuX connects incoming messages, AI reasoning, CRM updates, calendar actions, automation rules, and analytics into one observable flow.",
    nodes: [
      { id: "channels", label: "Channels", caption: "DMs, calls, forms, email" },
      { id: "core", label: "OrzuX Core", caption: "Routing, realtime, webhooks" },
      { id: "ai", label: "AI Engine", caption: "Knowledge, intent, guardrails" },
      { id: "crm", label: "CRM", caption: "Contacts, deals, tasks" },
      { id: "calendar", label: "Calendar", caption: "Bookings, reminders, sync" },
      { id: "analytics", label: "Analytics", caption: "Quality, usage, ROI" },
    ],
  },
  faq: {
    title: "Questions teams ask before switching",
    subtitle:
      "Clear answers on channels, AI control, setup, handoff, and provider billing before you connect your first workspace.",
    items: [
      {
        question: "Which channels does OrzuX support?",
        answer:
          "OrzuX is built as a multi-channel platform, not a single messenger tool. Today it can bring WhatsApp Business through 360dialog, Instagram, Telegram, website forms, voice telephony, SMS, email, and Google Calendar workflows into one operating workspace.",
      },
      {
        question: "Is OrzuX only a chatbot?",
        answer:
          "No. The assistant can answer customers, but the platform also updates CRM records, books time, triggers automations, summarizes calls, creates follow-up tasks, and hands sensitive conversations to a human operator.",
      },
      {
        question: "How does the AI learn my business?",
        answer:
          "Teams can add verified knowledge, sync website content, define service rules, and tune agent behavior per channel. This keeps replies grounded in your business context instead of generic chatbot output.",
      },
      {
        question: "Can humans take over?",
        answer:
          "Yes. Operators can reply manually, pause AI for a channel or conversation, leave internal notes, review context, and continue escalations from the same inbox without losing the customer history.",
      },
      {
        question: "How does provider billing work?",
        answer:
          "The OrzuX subscription covers the platform workspace, AI features, automation, and product usage. External providers such as WhatsApp, Twilio, telephony, or messaging gateways may still bill usage directly through your connected provider accounts.",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start with one channel. Scale into the full platform.",
    subtitle:
      "Simple plans for teams moving from manual replies to AI-assisted communication, voice, CRM, booking, and automation.",
    startCta: "Start free",
    freeLabel: "Free",
    perMonth: "/mo",
    highlight: "Recommended",
    note: "Provider fees for WhatsApp, telephony, and messaging are billed separately by your connected providers.",
  },
  finalCta: {
    title: "Bring every customer conversation into one AI operating system.",
    subtitle:
      "Launch the free workspace, connect a channel, and see OrzuX turn messages, calls, bookings, and CRM updates into one flow.",
    primaryCta: "Start free",
    secondaryCta: "Book a demo",
  },
  auth: {
    modalTitle: "Welcome to OrzuX",
    modalDescription:
      "Sign in or create an account to launch your multi-channel AI workspace.",
    signIn: "Sign in",
    createAccount: "Create account",
    orEmail: "or email",
  },
  footer: {
    tagline:
      "Enterprise AI communication platform for inbox, voice, CRM, calendar, automation, and analytics.",
    columns: [
      {
        title: "Platform",
        links: [
          { label: "Products", href: "#platform" },
          { label: "Architecture", href: "#architecture" },
          { label: "Pricing", href: "#pricing" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Enterprise", href: "#enterprise" },
          { label: "FAQ", href: "#faq" },
          { label: "Demo", href: "mailto:hello@orzux.com?subject=OrzuX%20demo%20request" },
        ],
      },
    ],
  },
  microSignals: {
    voiceLines: ["Incoming - AI answering", "Outbound - reminder sent", "Handoff - operator"],
    incoming: [
      { channel: "whatsapp", text: "Can I book for tomorrow?" },
      { channel: "instagram", text: "How much does it cost?" },
      { channel: "telegram", text: "Is there a demo?" },
      { channel: "website_forms", text: "New lead from website" },
    ],
  },
  platformServices: [
    { id: "whatsapp", label: "WhatsApp", hint: "360dialog - inbox", liveLine: "Booking for tomorrow 3pm?" },
    { id: "instagram", label: "Instagram", hint: "DM - stories", liveLine: "Team plan available?" },
    { id: "telegram", label: "Telegram", hint: "Bot API", liveLine: "Demo request received" },
    { id: "voice", label: "Voice AI", hint: "Twilio - calls", liveLine: "Incoming +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "New form submission" },
    { id: "inbox", label: "Unified Inbox", hint: "All channels", liveLine: "3 channels - 1 screen" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "4:30 PM reserved" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead created" },
    { id: "automations", label: "Automations", hint: "Workflows", liveLine: "Follow-up in 24h" },
    { id: "telephony-system", label: "Phone System", hint: "SMS - monitor", liveLine: "SMS confirmation sent" },
    { id: "analytics", label: "Analytics", hint: "ROI - usage", liveLine: "78% AI handled" },
    { id: "calendar-app", label: "Calendar App", hint: "Events - tasks", liveLine: "Google sync OK" },
  ],
};

const RU: LandingCopy = {
  ...EN,
  meta: {
    title: "OrzuX | Enterprise AI-платформа для коммуникаций",
    description:
      "OrzuX объединяет AI inbox, голос, CRM, календарь, автоматизации, аналитику и клиентские каналы в одном рабочем пространстве.",
  },
  skipToContent: "Перейти к основному содержимому",
  header: {
    ...EN.header,
    login: "Войти",
    startFree: "Начать бесплатно",
    bookDemo: "Записаться на демо",
    openMenu: "Открыть навигацию",
    closeMenu: "Закрыть навигацию",
    nav: {
      services: "Сервисы",
      products: "Продукты",
      solutions: "Решения",
      enterprise: "Enterprise",
      developers: "Разработчикам",
      resources: "Ресурсы",
      pricing: "Тарифы",
      documentation: "Документация",
      company: "Компания",
    },
  },
  hero: {
    eyebrow: "Enterprise AI-платформа для коммуникаций",
    title: "Одно AI-пространство для всех разговоров с клиентами.",
    subtitle:
      "OrzuX отвечает на сообщения и звонки, обновляет CRM, бронирует встречи, запускает follow-up и оставляет команде полный контроль в WhatsApp, Instagram, Telegram, голосе, формах, email и календаре.",
    primaryCta: "Начать бесплатно",
    secondaryCta: "Записаться на демо",
    badge: "Живая демонстрация платформы",
    metrics: [
      { value: "7", label: "клиентских каналов" },
      { value: "24/7", label: "AI-покрытие ответов" },
      { value: "1", label: "общая карточка клиента" },
    ],
  },
  trust: {
    eyebrow: "Создано для команд с высоким уровнем сервиса",
    items: ["Продажи", "Поддержка", "Клиники", "Агентства", "Недвижимость", "HoReCa", "Сервисы", "Образование"],
  },
  liveDemo: {
    ...EN.liveDemo,
    title: "Командный центр OrzuX",
    subtitle: "AI отвечает, создает CRM-контекст, ведет звонки, бронирует время и синхронизирует команду.",
    status: "Живая система",
    inbox: "Inbox",
    aiResponse: "AI-ответ",
    crm: "CRM",
    voice: "Голос",
    calendar: "Календарь",
    actions: "Действия",
    guardrailTitle: "AI-контроль",
    guardrailText:
      "Ответ проверен по базе знаний, политика канала соблюдена, handoff доступен.",
    synced: "Синхронизировано",
    events: [
      {
        id: "booking",
        channel: "whatsapp",
        label: "Лид из WhatsApp",
        customer: "Амина Р.",
        message: "Можно записаться завтра после 15:00?",
        aiReply: "Да. Есть 15:30 и 16:15. Я могу забронировать слот и отправить подтверждение.",
        intent: "Запрос на бронь",
        deal: "Консультация - qualified",
        nextStep: "Отправить подтверждение",
        callStatus: "Звонок не нужен",
        calendar: "15:30 зарезервировано",
        metric: "Ответ за 12 сек",
      },
      {
        id: "pricing",
        channel: "instagram",
        label: "Instagram DM",
        customer: "Nova Studio",
        message: "Есть месячные тарифы для команды?",
        aiReply: "Да. Starter покрывает один канал. Pro добавляет Voice AI, автоматизации и расширенную аналитику.",
        intent: "Вопрос о цене",
        deal: "Team plan - warm",
        nextStep: "Показать Pro",
        callStatus: "Follow-up в очереди",
        calendar: "Ссылка на демо готова",
        metric: "Сделка создана",
      },
      {
        id: "voice",
        channel: "voice",
        label: "AI-звонок",
        customer: "+49 152 8840",
        message: "Клиент спрашивает доступное время и варианты оплаты.",
        aiReply: "AI говорит естественно, проверяет часы работы и готовит краткое резюме для команды.",
        intent: "Запись и оплата",
        deal: "Входящий звонок - new",
        nextStep: "SMS-резюме",
        callStatus: "AI отвечает",
        calendar: "Слоты проверены",
        metric: "Голос активен",
      },
      {
        id: "form",
        channel: "website_forms",
        label: "Форма на сайте",
        customer: "Mira Clinic",
        message: "Новая enterprise-заявка с сайта.",
        aiReply: "Лид обогащен, направлен в нужное пространство и назначен с рекомендуемым действием.",
        intent: "Enterprise-запрос",
        deal: "Enterprise - priority",
        nextStep: "Назначить владельца",
        callStatus: "Менеджер уведомлен",
        calendar: "Предложен discovery call",
        metric: "SLA защищен",
      },
    ],
  },
  platform: {
    eyebrow: "Продуктовая платформа",
    title: "Все, что происходит после разговора, связано в одну систему.",
    subtitle:
      "OrzuX показывает продукт сразу: это не еще один чатбот, а рабочий слой для коммуникаций, CRM, звонков, бронирований и автоматизаций.",
    cards: [
      { ...EN.platform.cards[0]!, title: "Единый Inbox", description: "Все каналы попадают в одно приоритетное пространство с назначениями, заметками и handoff.", metric: "Все каналы", detail: "Одна очередь" },
      { ...EN.platform.cards[1]!, title: "OrzuX Assistant", description: "AI отвечает на основе знаний бизнеса, помнит контекст клиента и уважает настройки каналов.", metric: "Grounded AI", detail: "Знает контекст" },
      { ...EN.platform.cards[2]!, title: "Voice AI", description: "Отвечает на звонки, резюмирует исход, запускает SMS и передает оператору при необходимости.", metric: "Всегда на связи", detail: "Готов к звонкам" },
      { ...EN.platform.cards[3]!, title: "CRM и сделки", description: "Превращает ответы в контакты, сделки, задачи и следующие действия.", metric: "Автообновление", detail: "Без копирования" },
      { ...EN.platform.cards[4]!, title: "Календарь и бронирования", description: "Создает страницы записи, проверяет доступность, отправляет напоминания и синхронизирует Google Calendar.", metric: "Синхронизировано", detail: "Booking engine" },
      { ...EN.platform.cards[5]!, title: "AI-аналитика", description: "Показывает объем, usage, качество, каналы, скорость ответа и revenue-сигналы.", metric: "Наблюдаемо", detail: "AI ops" },
    ],
  },
  solutions: {
    eyebrow: "Решения",
    title: "Для команд, где каждый пропущенный ответ стоит выручки.",
    subtitle:
      "OrzuX сфокусирован на сценариях, где нужны быстрые ответы, чистый handoff и бизнес-действия после разговора.",
    cards: [
      {
        title: "Продажи и квалификация лидов",
        description: "Мгновенно отвечайте на входящий спрос и переносите серьезных клиентов в CRM.",
        outcomes: ["Квалификация intent", "Создание сделок", "Бронирование демо"],
      },
      {
        title: "Поддержка и сервис",
        description: "Закрывайте повторяющиеся вопросы, а чувствительные обращения передавайте людям.",
        outcomes: ["Ответы по базе знаний", "Правила handoff", "История диалога"],
      },
      {
        title: "Бизнесы с бронированиями",
        description: "AI координирует записи из DM, звонков, форм и календаря.",
        outcomes: ["Страницы записи", "Напоминания", "Google sync"],
      },
    ],
  },
  enterprise: {
    eyebrow: "Enterprise-ready",
    title: "Автономность с наблюдением, контекстом и контролем.",
    subtitle:
      "Enterprise AI работает только тогда, когда команда понимает действия агента, контролирует поведение и сохраняет прозрачность провайдеров.",
    pillars: [
      { ...EN.enterprise.pillars[0]!, title: "Human handoff", description: "AI может остановиться, передать диалог или дать оператору ответить из той же карточки клиента.", metric: "Под контролем", detail: "Handoff встроен" },
      { ...EN.enterprise.pillars[1]!, title: "Данные в рамках бизнеса", description: "Рабочие пространства, каналы, ключи, диалоги и автоматизации разделены по бизнес-контексту.", metric: "Scoped", detail: "Tenant-aware" },
      { ...EN.enterprise.pillars[2]!, title: "Операционная видимость", description: "Менеджеры видят объем AI, качество, состояние очереди и результаты по каналам.", metric: "Измеримо", detail: "AI ops" },
    ],
  },
  platformStrip: {
    title: "Платформа OrzuX",
    subtitle: "Официальные интеграции - live-модули",
    liveLabel: "Live",
  },
  architecture: {
    eyebrow: "Архитектура",
    title: "От события в канале до бизнес-результата.",
    subtitle:
      "OrzuX связывает входящие сообщения, AI-логику, CRM, календарь, автоматизации и аналитику в один наблюдаемый поток.",
    nodes: [
      { id: "channels", label: "Каналы", caption: "DM, звонки, формы, email" },
      { id: "core", label: "OrzuX Core", caption: "Routing, realtime, webhooks" },
      { id: "ai", label: "AI Engine", caption: "Знания, intent, guardrails" },
      { id: "crm", label: "CRM", caption: "Контакты, сделки, задачи" },
      { id: "calendar", label: "Календарь", caption: "Брони, напоминания, sync" },
      { id: "analytics", label: "Аналитика", caption: "Качество, usage, ROI" },
    ],
  },
  faq: {
    title: "Что команды спрашивают перед переходом",
    subtitle: "Короткие ответы для приветственной страницы. После входа продукт раскрывается глубже.",
    items: [
      {
        question: "Какие каналы поддерживает OrzuX?",
        answer:
          "WhatsApp через 360dialog, Instagram, Telegram, формы сайта, голосовая телефония, SMS, email и сценарии Google Calendar.",
      },
      {
        question: "OrzuX - это только чатбот?",
        answer:
          "Нет. AI отвечает, обновляет CRM, бронирует время, запускает автоматизации, резюмирует звонки и передает диалог человеку.",
      },
      {
        question: "Как AI узнает мой бизнес?",
        answer:
          "Команда добавляет базу знаний, синхронизирует сайт и настраивает поведение агента по каналам.",
      },
      {
        question: "Может ли человек забрать диалог?",
        answer:
          "Да. Оператор может ответить вручную, выключить AI по каналу, оставить внутренние заметки и обработать escalation.",
      },
      {
        question: "Как работает биллинг провайдеров?",
        answer:
          "Подписка OrzuX покрывает платформу. WhatsApp, Twilio и похожие провайдеры оплачиваются отдельно в ваших аккаунтах.",
      },
    ],
  },
  pricing: {
    eyebrow: "Тарифы",
    title: "Начните с одного канала. Дорастите до полной платформы.",
    subtitle:
      "Понятные планы для команд, которые переходят от ручных ответов к AI-коммуникациям, голосу, CRM, бронированию и автоматизациям.",
    startCta: "Начать бесплатно",
    freeLabel: "Бесплатно",
    perMonth: "/мес",
    highlight: "Рекомендуем",
    note: "Комиссии WhatsApp, телефонии и сообщений оплачиваются отдельно у подключенных провайдеров.",
  },
  finalCta: {
    title: "Соберите все разговоры с клиентами в одну AI-операционную систему.",
    subtitle:
      "Запустите бесплатное пространство, подключите канал и посмотрите, как OrzuX превращает сообщения, звонки, брони и CRM в один поток.",
    primaryCta: "Начать бесплатно",
    secondaryCta: "Записаться на демо",
  },
  auth: {
    modalTitle: "Добро пожаловать в OrzuX",
    modalDescription:
      "Войдите или создайте аккаунт, чтобы запустить multi-channel AI workspace.",
    signIn: "Войти",
    createAccount: "Создать аккаунт",
    orEmail: "или email",
  },
  footer: {
    tagline:
      "Enterprise AI-платформа для inbox, голоса, CRM, календаря, автоматизаций и аналитики.",
    columns: [
      {
        title: "Платформа",
        links: [
          { label: "Продукты", href: "#platform" },
          { label: "Архитектура", href: "#architecture" },
          { label: "Тарифы", href: "#pricing" },
        ],
      },
      {
        title: "Компания",
        links: [
          { label: "Enterprise", href: "#enterprise" },
          { label: "FAQ", href: "#faq" },
          { label: "Демо", href: "mailto:hello@orzux.com?subject=OrzuX%20demo%20request" },
        ],
      },
    ],
  },
  microSignals: {
    voiceLines: ["Входящий - AI отвечает", "Исходящий - напоминание", "Handoff - оператор"],
    incoming: [
      { channel: "whatsapp", text: "Можно записаться на завтра?" },
      { channel: "instagram", text: "Сколько стоит?" },
      { channel: "telegram", text: "Есть demo?" },
      { channel: "website_forms", text: "Заявка с сайта" },
    ],
  },
  platformServices: [
    { id: "whatsapp", label: "WhatsApp", hint: "360dialog - inbox", liveLine: "Запись на завтра 15:00?" },
    { id: "instagram", label: "Instagram", hint: "DM - stories", liveLine: "Есть тариф для команды?" },
    { id: "telegram", label: "Telegram", hint: "Bot API", liveLine: "Запрос демо получен" },
    { id: "voice", label: "Voice AI", hint: "Twilio - calls", liveLine: "Входящий +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "Новая заявка" },
    { id: "inbox", label: "Unified Inbox", hint: "Все каналы", liveLine: "3 канала - 1 экран" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "16:30 зарезервировано" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead создан" },
    { id: "automations", label: "Automations", hint: "Workflows", liveLine: "Follow-up через 24ч" },
    { id: "telephony-system", label: "Phone System", hint: "SMS - monitor", liveLine: "SMS подтверждение" },
    { id: "analytics", label: "Analytics", hint: "ROI - usage", liveLine: "78% AI handled" },
    { id: "calendar-app", label: "Calendar App", hint: "Events - tasks", liveLine: "Google sync OK" },
  ],
};

const UZ: LandingCopy = {
  ...EN,
  meta: {
    title: "OrzuX | Enterprise AI aloqa platformasi",
    description:
      "OrzuX AI inbox, ovoz, CRM, taqvim, avtomatlashtirish, analitika va mijoz kanallarini bitta ish maydonida birlashtiradi.",
  },
  skipToContent: "Asosiy kontentga o'tish",
  header: {
    ...EN.header,
    login: "Kirish",
    startFree: "Bepul boshlash",
    bookDemo: "Demo bron qilish",
    openMenu: "Navigatsiyani ochish",
    closeMenu: "Navigatsiyani yopish",
    nav: {
      services: "Servislar",
      products: "Mahsulotlar",
      solutions: "Yechimlar",
      enterprise: "Enterprise",
      developers: "Dasturchilar",
      resources: "Resurslar",
      pricing: "Narxlar",
      documentation: "Hujjatlar",
      company: "Kompaniya",
    },
  },
  hero: {
    eyebrow: "Enterprise AI aloqa platformasi",
    title: "Har bir mijoz suhbati uchun yagona AI ish maydoni.",
    subtitle:
      "OrzuX xabar va qo'ng'iroqlarga javob beradi, CRMni yangilaydi, uchrashuv bron qiladi, follow-up ishga tushiradi va WhatsApp, Instagram, Telegram, ovoz, formalar, email va taqvimda jamoaga nazorat beradi.",
    primaryCta: "Bepul boshlash",
    secondaryCta: "Demo bron qilish",
    badge: "Jonli platforma ko'rinishi",
    metrics: [
      { value: "7", label: "mijoz kanali" },
      { value: "24/7", label: "AI javob qamrovi" },
      { value: "1", label: "umumiy mijoz kartasi" },
    ],
  },
  trust: {
    eyebrow: "Yuqori servisli jamoalar uchun",
    items: ["Sales", "Support", "Klinikalar", "Agentliklar", "Ko'chmas mulk", "Hospitality", "Servislar", "Ta'lim"],
  },
  liveDemo: {
    ...EN.liveDemo,
    title: "OrzuX command center",
    subtitle: "AI javob beradi, CRM kontekst yaratadi, qo'ng'iroqni boshqaradi, vaqt bron qiladi va jamoani sinxronlaydi.",
    status: "Jonli tizim",
    inbox: "Inbox",
    aiResponse: "AI javob",
    crm: "CRM",
    voice: "Ovoz",
    calendar: "Taqvim",
    actions: "Harakatlar",
    guardrailTitle: "AI guardrail",
    guardrailText:
      "Javob knowledge asosida, kanal siyosati tekshirildi, human handoff mavjud.",
    synced: "Sinxron",
    events: [
      {
        id: "booking",
        channel: "whatsapp",
        label: "WhatsApp lead",
        customer: "Amina R.",
        message: "Ertaga 15:00 dan keyin konsultatsiya bormi?",
        aiReply: "Ha. 15:30 va 16:15 bo'sh. Slotni bron qilib tasdiq yuborishim mumkin.",
        intent: "Booking so'rovi",
        deal: "Consultation - qualified",
        nextStep: "Tasdiq yuborish",
        callStatus: "Qo'ng'iroq kerak emas",
        calendar: "15:30 bron qilindi",
        metric: "12 sec reply",
      },
      {
        id: "pricing",
        channel: "instagram",
        label: "Instagram DM",
        customer: "Nova Studio",
        message: "Jamoa uchun oylik tariflar bormi?",
        aiReply: "Ha. Starter bitta kanalni qamraydi. Pro Voice AI, avtomatlashtirish va keng analitikani qo'shadi.",
        intent: "Pricing savoli",
        deal: "Team plan - warm",
        nextStep: "Pro tarifini ulashish",
        callStatus: "Follow-up navbatda",
        calendar: "Demo link tayyor",
        metric: "Deal yaratildi",
      },
      {
        id: "voice",
        channel: "voice",
        label: "AI qo'ng'iroq",
        customer: "+49 152 8840",
        message: "Mijoz bo'sh vaqt va to'lov variantlarini so'rayapti.",
        aiReply: "AI tabiiy gaplashmoqda, ish vaqtini tekshirmoqda va jamoa uchun xulosa tayyorlamoqda.",
        intent: "Uchrashuv + to'lov",
        deal: "Inbound call - new",
        nextStep: "SMS xulosa",
        callStatus: "AI javob beradi",
        calendar: "Slotlar tekshirildi",
        metric: "Voice active",
      },
      {
        id: "form",
        channel: "website_forms",
        label: "Website form",
        customer: "Mira Clinic",
        message: "Saytdan yangi enterprise so'rov.",
        aiReply: "Lead boyitildi, kerakli workspacega yo'naltirildi va tavsiya qilingan keyingi qadam bilan biriktirildi.",
        intent: "Enterprise so'rov",
        deal: "Enterprise - priority",
        nextStep: "Owner biriktirish",
        callStatus: "Menejer xabardor",
        calendar: "Discovery call taklif qilindi",
        metric: "SLA himoyada",
      },
    ],
  },
  platform: {
    eyebrow: "Mahsulot platformasi",
    title: "Suhbat ortidagi hamma narsa ulangan.",
    subtitle:
      "OrzuX mahsulotni darhol ko'rsatadi: bu yana bir chatbot emas, balki aloqa, CRM, qo'ng'iroq, bron va avtomatlashtirish uchun ish qatlami.",
    cards: [
      { ...EN.platform.cards[0]!, title: "Unified Inbox", description: "Barcha kanallar bitta ustuvor ish maydoniga kiradi: assignment, notes va handoff bilan.", metric: "Barcha kanallar", detail: "Bitta queue" },
      { ...EN.platform.cards[1]!, title: "OrzuX Assistant", description: "AI biznes bilimlari asosida javob beradi, mijoz kontekstini eslaydi va kanal nazoratiga rioya qiladi.", metric: "Grounded AI", detail: "Kontekstli" },
      { ...EN.platform.cards[2]!, title: "Voice AI", description: "Qo'ng'iroqlarga javob beradi, xulosalaydi, SMS yuboradi va kerak bo'lsa insonga o'tkazadi.", metric: "Doim faol", detail: "Phone-ready" },
      { ...EN.platform.cards[3]!, title: "CRM va bitimlar", description: "Javoblarni kontakt, pipeline, task va keyingi harakatlarga aylantiradi.", metric: "Auto-update", detail: "Copy-paste yo'q" },
      { ...EN.platform.cards[4]!, title: "Taqvim va booking", description: "Booking sahifalari, availability, eslatmalar va Google Calendar sync.", metric: "Synced", detail: "Booking engine" },
      { ...EN.platform.cards[5]!, title: "AI analitika", description: "Hajm, usage, sifat, kanallar, javob tezligi va revenue signallarini ko'rsatadi.", metric: "Observable", detail: "AI ops" },
    ],
  },
  solutions: {
    eyebrow: "Yechimlar",
    title: "Har bir javobsiz xabar daromadga ta'sir qiladigan jamoalar uchun.",
    subtitle:
      "OrzuX tez javob, aniq handoff va suhbatdan keyingi biznes-harakatlar kerak bo'lgan workflowlarga fokuslanadi.",
    cards: [
      {
        title: "Sales va lead qualification",
        description: "Inbound talabga darhol javob bering va jiddiy xaridorlarni CRMga olib kiring.",
        outcomes: ["Intent aniqlash", "Deal yaratish", "Demo bron qilish"],
      },
      {
        title: "Support va servis",
        description: "Takroriy savollarni yoping, nozik holatlarni esa insonga o'tkazing.",
        outcomes: ["Bilimga asoslangan javob", "Handoff qoidalari", "Suhbat tarixi"],
      },
      {
        title: "Booking-heavy bizneslar",
        description: "AI DM, qo'ng'iroq, forma va taqvimdan kelgan uchrashuvlarni muvofiqlashtiradi.",
        outcomes: ["Booking sahifalar", "Eslatmalar", "Google sync"],
      },
    ],
  },
  enterprise: {
    eyebrow: "Enterprise-ready",
    title: "Nazorat, kontekst va supervision bilan avtonomiya.",
    subtitle:
      "Enterprise AI agent nima qilganini ko'rish, xatti-harakatini boshqarish va providerlarni aniq saqlash mumkin bo'lganda ishlaydi.",
    pillars: [
      { ...EN.enterprise.pillars[0]!, title: "Human handoff", description: "AI to'xtashi, eskalatsiya qilishi yoki operatorga bir xil customer recorddan javob berishga ruxsat berishi mumkin.", metric: "Controlled", detail: "Handoff built in" },
      { ...EN.enterprise.pillars[1]!, title: "Business-scoped data", description: "Workspace, kanal, kalit, suhbat va avtomatlashtirishlar biznes kontekst bo'yicha ajratiladi.", metric: "Scoped", detail: "Tenant-aware" },
      { ...EN.enterprise.pillars[2]!, title: "Operational visibility", description: "Menejerlar AI hajmi, sifat signallari, queue health va kanal natijalarini kuzatadi.", metric: "Measurable", detail: "AI ops" },
    ],
  },
  platformStrip: {
    title: "OrzuX Platformasi",
    subtitle: "Rasmiy integratsiyalar - jonli modullar",
    liveLabel: "Live",
  },
  architecture: {
    eyebrow: "Arxitektura",
    title: "Kanal eventidan biznes natijagacha.",
    subtitle:
      "OrzuX kiruvchi xabarlar, AI reasoning, CRM, taqvim, avtomatlashtirish va analitikani bitta kuzatiladigan oqimga ulaydi.",
    nodes: [
      { id: "channels", label: "Kanallar", caption: "DM, call, form, email" },
      { id: "core", label: "OrzuX Core", caption: "Routing, realtime, webhooks" },
      { id: "ai", label: "AI Engine", caption: "Knowledge, intent, guardrails" },
      { id: "crm", label: "CRM", caption: "Kontaktlar, deal, task" },
      { id: "calendar", label: "Taqvim", caption: "Booking, reminder, sync" },
      { id: "analytics", label: "Analitika", caption: "Sifat, usage, ROI" },
    ],
  },
  faq: {
    title: "Jamoalar o'tishdan oldin so'raydigan savollar",
    subtitle: "Welcome page uchun qisqa javoblar. Sign-in dan keyin mahsulot chuqurroq ochiladi.",
    items: [
      {
        question: "OrzuX qaysi kanallarni qo'llab-quvvatlaydi?",
        answer:
          "360dialog orqali WhatsApp, Instagram, Telegram, website forms, voice telephony, SMS, email va Google Calendar workflowlari.",
      },
      {
        question: "OrzuX faqat chatbotmi?",
        answer:
          "Yo'q. AI javob beradi, CRMni yangilaydi, vaqt bron qiladi, avtomatlashtirish ishga tushiradi, qo'ng'iroqlarni xulosalaydi va insonga handoff qiladi.",
      },
      {
        question: "AI biznesimni qanday o'rganadi?",
        answer:
          "Jamoalar knowledge entry qo'shadi, website knowledge sync qiladi va kanal bo'yicha agent xatti-harakatini sozlaydi.",
      },
      {
        question: "Inson suhbatni olishi mumkinmi?",
        answer:
          "Ha. Operator qo'lda javob berishi, kanal bo'yicha AIni o'chirishi, internal notes yozishi va eskalatsiyani boshqarishi mumkin.",
      },
      {
        question: "Provider billing qanday ishlaydi?",
        answer:
          "OrzuX obunasi platformani qamraydi. WhatsApp, Twilio va o'xshash providerlar alohida, o'z accountlaringiz orqali billing qiladi.",
      },
    ],
  },
  pricing: {
    eyebrow: "Narxlar",
    title: "Bitta kanaldan boshlang. To'liq platformagacha kengaying.",
    subtitle:
      "Manual javoblardan AI-assisted communication, voice, CRM, booking va automationga o'tayotgan jamoalar uchun sodda planlar.",
    startCta: "Bepul boshlash",
    freeLabel: "Bepul",
    perMonth: "/oy",
    highlight: "Tavsiya etiladi",
    note: "WhatsApp, telefoniya va messaging provider to'lovlari ulangan providerlar tomonidan alohida billing qilinadi.",
  },
  finalCta: {
    title: "Har bir mijoz suhbatini bitta AI operating systemga olib kiring.",
    subtitle:
      "Bepul workspace oching, kanal ulang va OrzuX xabar, qo'ng'iroq, booking va CRM update'larni bitta oqimga aylantirishini ko'ring.",
    primaryCta: "Bepul boshlash",
    secondaryCta: "Demo bron qilish",
  },
  auth: {
    modalTitle: "OrzuX ga xush kelibsiz",
    modalDescription:
      "Multi-channel AI workspace'ni ishga tushirish uchun kiring yoki account yarating.",
    signIn: "Kirish",
    createAccount: "Account yaratish",
    orEmail: "yoki email",
  },
  footer: {
    tagline:
      "Inbox, voice, CRM, calendar, automation va analytics uchun Enterprise AI aloqa platformasi.",
    columns: [
      {
        title: "Platforma",
        links: [
          { label: "Mahsulotlar", href: "#platform" },
          { label: "Arxitektura", href: "#architecture" },
          { label: "Narxlar", href: "#pricing" },
        ],
      },
      {
        title: "Kompaniya",
        links: [
          { label: "Enterprise", href: "#enterprise" },
          { label: "FAQ", href: "#faq" },
          { label: "Demo", href: "mailto:hello@orzux.com?subject=OrzuX%20demo%20request" },
        ],
      },
    ],
  },
  microSignals: {
    voiceLines: ["Kiruvchi - AI javob beradi", "Chiquvchi - eslatma", "Handoff - operator"],
    incoming: [
      { channel: "whatsapp", text: "Ertaga yozilsam bo'ladimi?" },
      { channel: "instagram", text: "Narxi qancha?" },
      { channel: "telegram", text: "Demo bormi?" },
      { channel: "website_forms", text: "Saytdan ariza" },
    ],
  },
  platformServices: [
    { id: "whatsapp", label: "WhatsApp", hint: "360dialog - inbox", liveLine: "Ertaga 15:00 ga booking?" },
    { id: "instagram", label: "Instagram", hint: "DM - stories", liveLine: "Team tarif bormi?" },
    { id: "telegram", label: "Telegram", hint: "Bot API", liveLine: "Demo so'rovi keldi" },
    { id: "voice", label: "Voice AI", hint: "Twilio - calls", liveLine: "Kiruvchi +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "Yangi ariza" },
    { id: "inbox", label: "Unified Inbox", hint: "Barcha kanallar", liveLine: "3 kanal - 1 ekran" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "16:30 bron qilindi" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead yaratildi" },
    { id: "automations", label: "Automations", hint: "Workflows", liveLine: "Follow-up 24 soatda" },
    { id: "telephony-system", label: "Phone System", hint: "SMS - monitor", liveLine: "SMS tasdiq yuborildi" },
    { id: "analytics", label: "Analytics", hint: "ROI - usage", liveLine: "78% AI handled" },
    { id: "calendar-app", label: "Calendar App", hint: "Events - tasks", liveLine: "Google sync OK" },
  ],
};

export const LANDING_I18N: Record<LandingLocale, LandingCopy> = {
  en: EN,
  ru: RU,
  uz: UZ,
};

export function getLandingCopy(locale: LandingLocale): LandingCopy {
  return LANDING_I18N[locale];
}
