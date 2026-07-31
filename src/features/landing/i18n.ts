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
  | "website_chat"
  | "voice"
  | "email"
  | "google_calendar";

export type { LandingLiveEvent } from "./demo/types";

export type LandingIconKey =
  | "ai"
  | "analytics"
  | "api"
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
      resources: string;
      pricing: string;
      documentation: string;
      company: string;
    };
    mega: Record<"products" | "solutions" | "resources", LandingMegaPanel>;
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
  cardDetail: {
    hide: string;
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
    calls: string;
    calendar: string;
    actions: string;
    guardrailTitle: string;
    guardrailText: string;
    synced: string;
    crmActions: string;
    playCall: string;
    pauseCall: string;
    callListeningHint: string;
    liveTranscript: string;
    openCalendar: string;
    calendarTitle: string;
    bookingLive: string;
    thisWeek: string;
    calendarSync: string;
    bookingSummary: string;
    summaryCustomer: string;
    summaryMeeting: string;
    summaryTime: string;
    summaryFollowUp: string;
    bookingFootnote: string;
    dialer: string;
    dialerHint: string;
    calendarListHint: string;
    calendarListPreview: string;
    addCalendarItem: string;
    addBooking: string;
    addEvent: string;
    addTask: string;
    calendarItemTitle: string;
    calendarHour: string;
    calendarMinute: string;
    saveCalendarItem: string;
    cancel: string;
    messagePlaceholder: string;
    sendMessage: string;
    emailSubjectLabel: string;
    emailBodyPlaceholder: string;
    emailSendAction: string;
    listenLive: string;
    stopListen: string;
    callListening: string;
    mute: string;
    unmute: string;
    callHold: string;
    resume: string;
    takeOver: string;
    endCall: string;
    startCall: string;
    callLive: string;
    callYourTurn: string;
    callAiSpeaking: string;
    callEmptyHint: string;
    callMicDenied: string;
    callUnsupported: string;
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
    honestyNote?: string;
    checklistTitle?: string;
    checklist?: string[];
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
    lead?: string;
    outcomeTitle?: string;
    outcomeBody?: string;
    principles?: { title: string; description: string }[];
    nodes: {
      id: string;
      label: string;
      caption: string;
      detail?: string;
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
    subscribeCta: string;
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
      "OrzuX unifies AI inbox, voice, CRM, calendar, analytics, and customer channels in one enterprise-ready workspace.",
  },
  skipToContent: "Skip to main content",
  header: {
    login: "Log in",
    startFree: "Trial period",
    bookDemo: "Book a demo",
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    nav: {
      products: "Products",
      services: "Services",
      solutions: "Solutions",
      enterprise: "Enterprise",
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
                description: "WhatsApp, Telegram, Website Chat, and Email in one queue.",
                href: "#platform",
                icon: "inbox",
              },
              {
                title: "Calls AI",
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
                title: "AI Analytics",
                description: "Channel performance, AI usage, response quality, and ROI signals.",
                href: "#enterprise",
                icon: "analytics",
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
        description:
          "Industry playbooks for teams that live in messaging, calls, and bookings.",
        columns: [
          {
            title: "Local & guest",
            items: [
              {
                title: "Clinics & medical",
                description: "Appointments, FAQs, and human-safe handoff.",
                href: "/docs/clinics-and-medical",
                icon: "calendar",
              },
              {
                title: "Beauty & salons",
                description: "Booking pages and chat that does not interrupt service.",
                href: "/docs/beauty-and-salons",
                icon: "spark",
              },
              {
                title: "Restaurants & cafés",
                description: "Reservations, events, and guest questions.",
                href: "/docs/restaurants-and-cafes",
                icon: "chat",
              },
              {
                title: "Hospitality & hotels",
                description: "Pre-arrival messaging and shared guest history.",
                href: "/docs/hospitality-and-hotels",
                icon: "users",
              },
            ],
          },
          {
            title: "Sales & field",
            items: [
              {
                title: "Real estate",
                description: "Qualify leads and book viewings with shared CRM.",
                href: "/docs/real-estate",
                icon: "crm",
              },
              {
                title: "Home services",
                description: "Forms, calls, and estimate scheduling for field teams.",
                href: "/docs/home-services",
                icon: "phone",
              },
              {
                title: "Auto & dealerships",
                description: "Service booking and sales/service conversation memory.",
                href: "/docs/auto-and-dealerships",
                icon: "workflow",
              },
              {
                title: "Professional services",
                description: "Intake forms and consult booking without free advice leaks.",
                href: "/docs/professional-services",
                icon: "guardrails",
              },
            ],
          },
          {
            title: "Growth",
            items: [
              {
                title: "Education & training",
                description: "Enrollment FAQs and consultation booking.",
                href: "/docs/education-and-training",
                icon: "docs",
              },
              {
                title: "Fitness & wellness",
                description: "Trials, membership questions, and front-desk chat.",
                href: "/docs/fitness-and-wellness",
                icon: "analytics",
              },
            ],
          },
        ],
        featured: {
          title: "All business use cases",
          description:
            "Ten industries with honest fit notes: pains, useful features, and first setup steps.",
          cta: "Browse use cases",
          href: "/docs/use-cases",
        },
      },
      resources: {
        title: "Resources",
        description:
          "Evaluate OrzuX with real product docs, pricing clarity, and company context — not slideware.",
        columns: [
          {
            title: "Learn",
            items: [
              {
                title: "Documentation",
                description:
                  "Operator guides for inbox, AI agent, CRM, calls, calendar, and trust.",
                href: "/docs",
                icon: "docs",
              },
              {
                title: "Getting started",
                description:
                  "From account creation to your first connected channel.",
                href: "/docs/getting-started",
                icon: "resources",
              },
              {
                title: "Pricing",
                description: "Start free, then scale by channels, seats, and voice.",
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
                description:
                  "An AI communication workspace for messages, calls, CRM, booking, and human-controlled automation.",
                href: "/docs/about",
                icon: "company",
              },
              {
                title: "Security & privacy",
                description:
                  "Auth, cookie consent, workspace scoping, and legal documents.",
                href: "/docs/security-and-privacy",
                icon: "security",
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
          title: "About OrzuX",
          description:
            "Built for teams that need one operational system behind every customer conversation — not a chatbot bolted onto a messenger.",
          cta: "Read About OrzuX",
          href: "/docs/about",
        },
      },
    },
  },
  hero: {
    eyebrow: "Enterprise AI communication platform",
    title: "One AI workspace for every customer conversation.",
    subtitle:
      "OrzuX answers messages and calls, updates CRM, books appointments, triggers follow-ups, and keeps humans in control across WhatsApp, Instagram, Telegram, voice, forms, email, and calendar.",
    primaryCta: "Trial period",
    secondaryCta: "Book a demo",
    badge: "Live platform preview",
    metrics: [
      { value: "7", label: "customer channels" },
      { value: "24/7", label: "AI response coverage" },
      { value: "1", label: "shared customer record" },
    ],
  },
  cardDetail: {
    hide: "Hide",
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
    title: "OrzuX workspace",
    subtitle: "Real channels, live AI chat, Calls AI, bookings, and CRM actions — the same stack as inside the product.",
    status: "Live system",
    inbox: "Inbox",
    aiResponse: "OrzuX AI",
    crm: "CRM",
    calls: "AI Calls",
    calendar: "Calendar",
    actions: "Actions",
    guardrailTitle: "AI guardrail",
    guardrailText:
      "Knowledge-grounded reply, channel policy checked, human handoff available.",
    synced: "Synced",
    crmActions: "CRM actions",
    playCall: "Play conversation",
    pauseCall: "Pause",
    callListeningHint: "Press play to hear customer ↔ AI — same monitor flow as Calls AI.",
    liveTranscript: "Live call transcript",
    openCalendar: "Open calendar booking",
    calendarTitle: "Team calendar · bookings",
    bookingLive: "Live bookings",
    thisWeek: "This week",
    calendarSync: "Google Calendar sync ready",
    bookingSummary: "Booking summary",
    summaryCustomer: "Customer",
    summaryMeeting: "Meeting",
    summaryTime: "Time",
    summaryFollowUp: "Follow-up",
    bookingFootnote:
      "AI created the event, updated CRM, and queued the confirmation — same booking path as in-app.",
    dialer: "Dialer",
    dialerHint: "Enter a number like the in-app Calls dial pad.",
    calendarListHint: "Bookings · tasks · events",
    calendarListPreview: "Open the team calendar and add a live demo booking.",
    addCalendarItem: "Add",
    addBooking: "Booking",
    addEvent: "Event",
    addTask: "Task",
    calendarItemTitle: "Title",
    calendarHour: "Hour",
    calendarMinute: "Minute",
    saveCalendarItem: "Save",
    cancel: "Cancel",
    messagePlaceholder: "Type a message",
    sendMessage: "Send",
    emailSubjectLabel: "Subject",
    emailBodyPlaceholder: "Write your email reply…",
    emailSendAction: "Send",
    listenLive: "Listen live",
    stopListen: "Stop listening",
    callListening: "Listening",
    mute: "Mute",
    unmute: "Unmute",
    callHold: "Hold",
    resume: "Resume",
    takeOver: "Take over",
    endCall: "End call",
    startCall: "Call",
    callLive: "Live call",
    callYourTurn: "Your turn — speak",
    callAiSpeaking: "AI speaking",
    callEmptyHint: "Press Call to talk with AI live (1 min), or Play to hear the demo.",
    callMicDenied: "Microphone access is required for the live demo call.",
    callUnsupported: "Live voice needs Chrome, Edge, or Safari with speech recognition.",
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
        title: "Calls AI",
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
    title: "Built for control — not unchecked autonomy.",
    subtitle:
      "Enterprise readiness here means business-scoped data, human handoff, role permissions, audit-friendly conversation history, consent-aware analytics, and clear provider boundaries. It does not mean “we replaced your entire IT stack.”",
    honestyNote:
      "OrzuX is production software for multi-channel operations. Channel reliability depends on your provider credentials (WhatsApp, Telegram, Twilio, email, Google). AI quality depends on your knowledge and review habits. We document what ships — and what still requires your setup.",
    checklistTitle: "What serious teams should verify before rollout",
    checklist: [
      "Business-scoped access: teammates only see their workspace data",
      "Human handoff: AI can be paused and a person can take the thread",
      "Knowledge grounding: answers come from content you control",
      "Channel activation: each channel is connected deliberately in Integrations",
      "Cookie/analytics consent: measurement is opt-in, not forced",
      "Billing clarity: plan limits and provider add-ons are visible in Subscription",
    ],
    pillars: [
      {
        id: "guardrails",
        title: "Human handoff & supervision",
        description:
          "Operators can reply manually, escalate sensitive cases, and keep AI from owning high-risk decisions. The same customer record stays visible during takeover.",
        metric: "Controllable AI",
        detail: "Handoff in the inbox",
        icon: "guardrails",
      },
      {
        id: "security",
        title: "Business-scoped tenancy",
        description:
          "Conversations, credentials, CRM records, and agent settings are scoped to the business workspace — not a flat shared pool across customers.",
        metric: "Tenant-aware",
        detail: "Workspace isolation",
        icon: "security",
      },
      {
        id: "observability",
        title: "Operational visibility",
        description:
          "Teams can monitor conversation volume, AI activity, call history, and analytics views that exist in the product today — enough to run the operation, not a fictional “AI trust score.”",
        metric: "Measurable",
        detail: "Inbox + analytics + calls",
        icon: "analytics",
      },
      {
        id: "roles",
        title: "Roles & team access",
        description:
          "Invite teammates with permissions so billing, integrations, and sensitive settings are not open to everyone by default.",
        metric: "Permissioned",
        detail: "Team workspace",
        icon: "users",
      },
      {
        id: "providers",
        title: "Provider-honest architecture",
        description:
          "Messaging and voice still run on real providers. OrzuX orchestrates them — it does not invent delivery guarantees beyond what WhatsApp, Telegram, Twilio, or email can do.",
        metric: "Transparent",
        detail: "Marketplace connections",
        icon: "integrations",
      },
      {
        id: "privacy",
        title: "Consent & legal surfaces",
        description:
          "Cookie preferences gate analytics. Privacy, Terms, and data-deletion pages are first-class. You remain responsible for customer messaging consent in your jurisdiction.",
        metric: "Accountable",
        detail: "Privacy + cookies",
        icon: "enterprise",
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
      "OrzuX is an operations pipeline: an inbound message or call becomes routing, optional AI reasoning, CRM context, booking actions, and measurable activity — with humans able to intervene.",
    lead:
      "This is not six marketing tiles. It is the path a real customer event travels inside the workspace when channels and AI are configured.",
    outcomeTitle: "Outcome: a handled customer moment with durable business state",
    outcomeBody:
      "The thread is answered or handed off, the contact record stays updated, a booking or follow-up can be created, and the team can see what happened — instead of losing the interaction in a personal phone chat.",
    principles: [
      {
        title: "Event in, state out",
        description:
          "Inbound channel events create or update conversations. Outcomes land in CRM, calendar, orders, or call history — not only in a disposable reply bubble.",
      },
      {
        title: "AI is optional, not mandatory",
        description:
          "Humans can run the inbox without the agent. When AI is enabled per channel, it uses your knowledge and tools under handoff rules.",
      },
      {
        title: "Observable by design",
        description:
          "Realtime inbox updates, delivery tracking, call monitor, and analytics exist so operations are inspectable — not a black box.",
      },
    ],
    nodes: [
      {
        id: "channels",
        label: "Channel event",
        caption: "WhatsApp, Telegram, Website Chat, Email, Forms, Voice, SMS",
        detail:
          "A customer writes, submits a form, or calls. The event enters OrzuX only for channels you connected in Integrations — empty channels stay empty by design.",
      },
      {
        id: "core",
        label: "OrzuX Core",
        caption: "Routing, auth scope, realtime, webhooks",
        detail:
          "The platform authenticates the business context, stores the conversation securely, and pushes realtime updates to operators in the shared inbox.",
      },
      {
        id: "ai",
        label: "AI Engine",
        caption: "Knowledge, tools, channel rules, guardrails",
        detail:
          "If enabled, the agent drafts or sends a reply using your knowledge base and registered tools. It can stop and escalate when handoff rules say a human should own the thread.",
      },
      {
        id: "crm",
        label: "CRM memory",
        caption: "Contacts, notes, work context",
        detail:
          "The person behind the message stays attached to a contact record so the next reply — AI or human — does not start from zero.",
      },
      {
        id: "calendar",
        label: "Business action",
        caption: "Booking, orders, tasks, callbacks",
        detail:
          "Qualified intent can become a calendar booking, an order/lead status change, a call callback, or a teammate follow-up — the operational step after the chat.",
      },
      {
        id: "analytics",
        label: "Signal & review",
        caption: "Volume, channel mix, AI usage, call history",
        detail:
          "Managers review activity in Analytics, Calls, and the inbox itself. Use it to tune knowledge and staffing — not as a substitute for financial reporting.",
      },
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
          "No. The assistant can answer customers, but the platform also updates CRM records, books time, summarizes calls, creates follow-up tasks, and hands sensitive conversations to a human operator.",
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
          "The OrzuX subscription covers the platform workspace, AI features, and product usage. External providers such as WhatsApp, Twilio, telephony, or messaging gateways may still bill usage directly through your connected provider accounts.",
      },
    ],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start with one channel. Scale into the full platform.",
    subtitle:
      "Simple plans for teams moving from manual replies to AI-assisted communication, voice, CRM, and booking.",
    startCta: "Trial period",
    subscribeCta: "Subscribe",
    freeLabel: "Free",
    perMonth: "/mo",
    highlight: "Recommended",
    note: "",
  },
  finalCta: {
    title: "Bring every customer conversation into one AI operating system.",
    subtitle:
      "Launch the free workspace, connect a channel, and see OrzuX turn messages, calls, bookings, and CRM updates into one flow.",
    primaryCta: "Trial period",
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
      "Enterprise AI communication platform for inbox, voice, CRM, calendar, and analytics.",
    columns: [
      {
        title: "Platform",
        links: [
          { label: "Products", href: "#platform" },
          { label: "Documentation", href: "/docs" },
          { label: "Pricing", href: "#pricing" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About OrzuX", href: "/docs/about" },
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
    { id: "voice", label: "Calls AI", hint: "Twilio - calls", liveLine: "Incoming +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "New form submission" },
    { id: "inbox", label: "Unified Inbox", hint: "All channels", liveLine: "3 channels - 1 screen" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "4:30 PM reserved" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead created" },
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
      "OrzuX объединяет AI inbox, голос, CRM, календарь, аналитику и клиентские каналы в одном рабочем пространстве.",
  },
  skipToContent: "Перейти к основному содержимому",
  header: {
    ...EN.header,
    login: "Войти",
    startFree: "Пробный период",
    bookDemo: "Записаться на демо",
    openMenu: "Открыть навигацию",
    closeMenu: "Закрыть навигацию",
    nav: {
      services: "Сервисы",
      products: "Продукты",
      solutions: "Решения",
      enterprise: "Enterprise",
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
    primaryCta: "Пробный период",
    secondaryCta: "Записаться на демо",
    badge: "Живая демонстрация платформы",
    metrics: [
      { value: "7", label: "клиентских каналов" },
      { value: "24/7", label: "AI-покрытие ответов" },
      { value: "1", label: "общая карточка клиента" },
    ],
  },
  cardDetail: {
    hide: "Скрыть",
  },
  trust: {
    eyebrow: "Создано для команд с высоким уровнем сервиса",
    items: ["Продажи", "Поддержка", "Клиники", "Агентства", "Недвижимость", "HoReCa", "Сервисы", "Образование"],
  },
  liveDemo: {
    ...EN.liveDemo,
    title: "Рабочее пространство OrzuX",
    subtitle:
      "Реальные каналы, живой AI-чат, Calls AI, бронирования и CRM — тот же стек, что внутри продукта.",
    status: "Живая система",
    inbox: "Inbox",
    aiResponse: "OrzuX AI",
    crm: "CRM",
    calls: "AI Calls",
    calendar: "Календарь",
    actions: "Действия",
    guardrailTitle: "AI-контроль",
    guardrailText:
      "Ответ проверен по базе знаний, политика канала соблюдена, handoff доступен.",
    synced: "Синхронизировано",
    crmActions: "CRM-действия",
    playCall: "Слушать разговор",
    pauseCall: "Пауза",
    callListeningHint: "Play — диалог клиент ↔ AI, как в мониторе Calls AI.",
    liveTranscript: "Живой транскрипт",
    openCalendar: "Открыть календарь",
    calendarTitle: "Календарь команды · брони",
    bookingLive: "Живые бронирования",
    thisWeek: "Эта неделя",
    calendarSync: "Синхронизация Google Calendar",
    bookingSummary: "Сводка брони",
    summaryCustomer: "Клиент",
    summaryMeeting: "Встреча",
    summaryTime: "Время",
    summaryFollowUp: "Follow-up",
    bookingFootnote:
      "AI создал событие, обновил CRM и поставил подтверждение в очередь — как в приложении.",
    dialer: "Номеронабиратель",
    dialerHint: "Наберите номер как в dial pad Calls.",
    calendarListHint: "Брони · задачи · события",
    calendarListPreview: "Откройте календарь и добавьте демо-бронирование.",
    addCalendarItem: "Добавить",
    addBooking: "Бронь",
    addEvent: "Событие",
    addTask: "Задача",
    calendarItemTitle: "Название",
    calendarHour: "Час",
    calendarMinute: "Минута",
    saveCalendarItem: "Сохранить",
    cancel: "Отмена",
    messagePlaceholder: "Введите сообщение",
    sendMessage: "Отправить",
    emailSubjectLabel: "Тема",
    emailBodyPlaceholder: "Напишите ответ…",
    emailSendAction: "Отправить",
    listenLive: "Слушать",
    stopListen: "Стоп",
    callListening: "Прослушивание",
    mute: "Mute",
    unmute: "Unmute",
    callHold: "Hold",
    resume: "Продолжить",
    takeOver: "Перехватить",
    endCall: "Завершить",
    startCall: "Звонить",
    callLive: "Живой звонок",
    callYourTurn: "Ваша очередь — говорите",
    callAiSpeaking: "AI отвечает",
    callEmptyHint: "Нажмите «Звонить», чтобы говорить с AI (1 мин), или Play для демо.",
    callMicDenied: "Для живого звонка нужен доступ к микрофону.",
    callUnsupported: "Живой голос работает в Chrome, Edge или Safari.",
  },
  platform: {
    eyebrow: "Продуктовая платформа",
    title: "Все, что происходит после разговора, связано в одну систему.",
    subtitle:
      "OrzuX показывает продукт сразу: это не еще один чатбот, а рабочий слой для коммуникаций, CRM, звонков и бронирований.",
    cards: [
      { ...EN.platform.cards[0]!, title: "Единый Inbox", description: "Все каналы попадают в одно приоритетное пространство с назначениями, заметками и handoff.", metric: "Все каналы", detail: "Одна очередь" },
      { ...EN.platform.cards[1]!, title: "OrzuX Assistant", description: "AI отвечает на основе знаний бизнеса, помнит контекст клиента и уважает настройки каналов.", metric: "Grounded AI", detail: "Знает контекст" },
      { ...EN.platform.cards[2]!, title: "Calls AI", description: "Отвечает на звонки, резюмирует исход, запускает SMS и передает оператору при необходимости.", metric: "Всегда на связи", detail: "Готов к звонкам" },
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
    ...EN.enterprise,
    eyebrow: "Enterprise readiness",
    title: "Контроль важнее бесконтрольной автономии.",
    subtitle:
      "Enterprise readiness здесь означает данные в рамках бизнеса, human handoff, роли, историю диалогов, consent-aware analytics и честные границы провайдеров — а не «мы заменили весь ваш IT-стек».",
    honestyNote:
      "OrzuX — production-платформа для мульти-канальных операций. Надёжность каналов зависит от ваших credentials. Качество AI — от базы знаний и review. Мы описываем то, что реально есть — и то, что требует вашей настройки.",
    checklistTitle: "Что проверить перед серьёзным запуском",
    checklist: [
      "Доступ в рамках бизнеса: команда видит только свой workspace",
      "Human handoff: AI можно остановить, диалог забирает человек",
      "Knowledge grounding: ответы опираются на ваш контент",
      "Активация каналов: каждый канал подключается осознанно",
      "Согласие на cookies/analytics: измерение opt-in",
      "Биллинг: лимиты плана и add-on провайдеров видны в Subscription",
    ],
  },
  platformStrip: {
    title: "Платформа OrzuX",
    subtitle: "Официальные интеграции - live-модули",
    liveLabel: "Live",
  },
  architecture: {
    ...EN.architecture,
    eyebrow: "Архитектура",
    title: "От события канала к бизнес-результату.",
    subtitle:
      "OrzuX — operational pipeline: входящее сообщение или звонок проходит routing, опциональный AI, CRM-контекст, действия бронирования и измеримую активность — с возможностью вмешательства человека.",
    lead:
      "Это не шесть маркетинговых плиток. Это путь реального customer event внутри workspace, когда каналы и AI настроены.",
    outcomeTitle: "Результат: обработанный момент клиента с сохранённым бизнес-состоянием",
    outcomeBody:
      "Диалог отвечен или передан человеку, контакт обновлён, можно создать booking/follow-up, команда видит что произошло — вместо потери переписки в личном чате телефона.",
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
          "Нет. AI отвечает, обновляет CRM, бронирует время, резюмирует звонки и передает диалог человеку.",
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
      "Понятные планы для команд, которые переходят от ручных ответов к AI-коммуникациям, голосу, CRM и бронированию.",
    startCta: "Пробный период",
    subscribeCta: "Оформить подписку",
    freeLabel: "Бесплатно",
    perMonth: "/мес",
    highlight: "Рекомендуем",
    note: "",
  },
  finalCta: {
    title: "Соберите все разговоры с клиентами в одну AI-операционную систему.",
    subtitle:
      "Запустите бесплатное пространство, подключите канал и посмотрите, как OrzuX превращает сообщения, звонки, брони и CRM в один поток.",
    primaryCta: "Пробный период",
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
      "Enterprise AI-платформа для inbox, голоса, CRM, календаря и аналитики.",
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
    { id: "voice", label: "Calls AI", hint: "Twilio - calls", liveLine: "Входящий +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "Новая заявка" },
    { id: "inbox", label: "Unified Inbox", hint: "Все каналы", liveLine: "3 канала - 1 экран" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "16:30 зарезервировано" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead создан" },
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
      "OrzuX AI inbox, ovoz, CRM, taqvim, analitika va mijoz kanallarini bitta ish maydonida birlashtiradi.",
  },
  skipToContent: "Asosiy kontentga o'tish",
  header: {
    ...EN.header,
    login: "Kirish",
    startFree: "Sinov davri",
    bookDemo: "Demo bron qilish",
    openMenu: "Navigatsiyani ochish",
    closeMenu: "Navigatsiyani yopish",
    nav: {
      services: "Servislar",
      products: "Mahsulotlar",
      solutions: "Yechimlar",
      enterprise: "Enterprise",
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
    primaryCta: "Sinov davri",
    secondaryCta: "Demo bron qilish",
    badge: "Jonli platforma ko'rinishi",
    metrics: [
      { value: "7", label: "mijoz kanali" },
      { value: "24/7", label: "AI javob qamrovi" },
      { value: "1", label: "umumiy mijoz kartasi" },
    ],
  },
  cardDetail: {
    hide: "Yashirish",
  },
  trust: {
    eyebrow: "Yuqori servisli jamoalar uchun",
    items: ["Sales", "Support", "Klinikalar", "Agentliklar", "Ko'chmas mulk", "Hospitality", "Servislar", "Ta'lim"],
  },
  liveDemo: {
    ...EN.liveDemo,
    title: "OrzuX workspace",
    subtitle:
      "Haqiqiy kanallar, jonli AI chat, Calls AI, bronlar va CRM — mahsulot ichidagi stack.",
    status: "Jonli tizim",
    inbox: "Inbox",
    aiResponse: "OrzuX AI",
    crm: "CRM",
    calls: "AI Calls",
    calendar: "Taqvim",
    actions: "Harakatlar",
    guardrailTitle: "AI guardrail",
    guardrailText:
      "Javob knowledge asosida, kanal siyosati tekshirildi, human handoff mavjud.",
    synced: "Sinxron",
    crmActions: "CRM harakatlar",
    playCall: "Suhbatni tinglash",
    pauseCall: "Pauza",
    callListeningHint: "Play — mijoz ↔ AI suhbat, Calls AI monitoridagi kabi.",
    liveTranscript: "Jonli transkript",
    openCalendar: "Taqvimni ochish",
    calendarTitle: "Jamoa taqvimi · bronlar",
    bookingLive: "Jonli bronlar",
    thisWeek: "Shu hafta",
    calendarSync: "Google Calendar sync",
    bookingSummary: "Bron xulosasi",
    summaryCustomer: "Mijoz",
    summaryMeeting: "Uchrashuv",
    summaryTime: "Vaqt",
    summaryFollowUp: "Follow-up",
    bookingFootnote:
      "AI event yaratdi, CRM yangiladi va tasdiqni navbatga qo'ydi — ilovadagi yo'l.",
    dialer: "Dialer",
    dialerHint: "Calls dial pad kabi raqam kiriting.",
    calendarListHint: "Bron · task · event",
    calendarListPreview: "Jamoa taqvimini oching va demo bron qo'shing.",
    addCalendarItem: "Qo'shish",
    addBooking: "Bron",
    addEvent: "Event",
    addTask: "Task",
    calendarItemTitle: "Sarlavha",
    calendarHour: "Soat",
    calendarMinute: "Daqiqa",
    saveCalendarItem: "Saqlash",
    cancel: "Bekor",
    messagePlaceholder: "Xabar yozing",
    sendMessage: "Yuborish",
    emailSubjectLabel: "Mavzu",
    emailBodyPlaceholder: "Email javob yozing…",
    emailSendAction: "Yuborish",
    listenLive: "Tinglash",
    stopListen: "To‘xtatish",
    callListening: "Tinglanmoqda",
    mute: "Mute",
    unmute: "Unmute",
    callHold: "Hold",
    resume: "Davom ettirish",
    takeOver: "O‘zlashtirish",
    endCall: "Yakunlash",
    startCall: "Qo‘ng‘iroq",
    callLive: "Jonli qo‘ng‘iroq",
    callYourTurn: "Sizning navbatingiz — gapiring",
    callAiSpeaking: "AI javob bermoqda",
    callEmptyHint: "AI bilan gaplashish uchun Call bosing (1 daqiqa) yoki demo uchun Play.",
    callMicDenied: "Jonli qo‘ng‘iroq uchun mikrofon ruxsati kerak.",
    callUnsupported: "Jonli ovoz Chrome, Edge yoki Safari’da ishlaydi.",
  },
  platform: {
    eyebrow: "Mahsulot platformasi",
    title: "Suhbat ortidagi hamma narsa ulangan.",
    subtitle:
      "OrzuX mahsulotni darhol ko'rsatadi: bu yana bir chatbot emas, balki aloqa, CRM, qo'ng'iroq va bron uchun ish qatlami.",
    cards: [
      { ...EN.platform.cards[0]!, title: "Unified Inbox", description: "Barcha kanallar bitta ustuvor ish maydoniga kiradi: assignment, notes va handoff bilan.", metric: "Barcha kanallar", detail: "Bitta queue" },
      { ...EN.platform.cards[1]!, title: "OrzuX Assistant", description: "AI biznes bilimlari asosida javob beradi, mijoz kontekstini eslaydi va kanal nazoratiga rioya qiladi.", metric: "Grounded AI", detail: "Kontekstli" },
      { ...EN.platform.cards[2]!, title: "Calls AI", description: "Qo'ng'iroqlarga javob beradi, xulosalaydi, SMS yuboradi va kerak bo'lsa insonga o'tkazadi.", metric: "Doim faol", detail: "Phone-ready" },
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
    ...EN.enterprise,
    eyebrow: "Enterprise readiness",
    title: "Nazorat — cheksiz avtonomiyadan muhimroq.",
    subtitle:
      "Bu yerda enterprise readiness biznes doirasidagi ma'lumot, human handoff, rollar, suhbat tarixi, consent-aware analytics va provider chegaralarini anglatadi.",
    honestyNote:
      "OrzuX — multi-channel operatsiyalar uchun production platforma. Kanal ishonchliligi credentiallaringizga bog'liq. AI sifati bilim bazasi va review odatlariga bog'liq.",
  },
  platformStrip: {
    title: "OrzuX Platformasi",
    subtitle: "Rasmiy integratsiyalar - jonli modullar",
    liveLabel: "Live",
  },
  architecture: {
    ...EN.architecture,
    eyebrow: "Arxitektura",
    title: "Kanal hodisasidan biznes natijasigacha.",
    subtitle:
      "OrzuX — operational pipeline: kiruvchi xabar yoki qo'ng'iroq routing, ixtiyoriy AI, CRM kontekst, booking harakatlari va o'lchanadigan faoliyatga aylanadi.",
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
          "Yo'q. AI javob beradi, CRMni yangilaydi, vaqt bron qiladi, qo'ng'iroqlarni xulosalaydi va insonga handoff qiladi.",
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
      "Manual javoblardan AI-assisted communication, voice, CRM va bookingga o'tayotgan jamoalar uchun sodda planlar.",
    startCta: "Sinov davri",
    subscribeCta: "Obuna bolish",
    freeLabel: "Bepul",
    perMonth: "/oy",
    highlight: "Tavsiya etiladi",
    note: "",
  },
  finalCta: {
    title: "Har bir mijoz suhbatini bitta AI operating systemga olib kiring.",
    subtitle:
      "Bepul workspace oching, kanal ulang va OrzuX xabar, qo'ng'iroq, booking va CRM update'larni bitta oqimga aylantirishini ko'ring.",
    primaryCta: "Sinov davri",
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
      "Inbox, voice, CRM, calendar va analytics uchun Enterprise AI aloqa platformasi.",
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
    { id: "voice", label: "Calls AI", hint: "Twilio - calls", liveLine: "Kiruvchi +49..." },
    { id: "website_forms", label: "Website Forms", hint: "Leads to inbox", liveLine: "Yangi ariza" },
    { id: "inbox", label: "Unified Inbox", hint: "Barcha kanallar", liveLine: "3 kanal - 1 ekran" },
    { id: "orzu-ai", label: "OrzuX Assistant", hint: "Agents - knowledge", liveLine: "Intent: pricing" },
    { id: "calendar", label: "Calendar", hint: "Booking - sync", liveLine: "16:30 bron qilindi" },
    { id: "crm", label: "CRM", hint: "Contacts - deals", liveLine: "Hot lead yaratildi" },
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
