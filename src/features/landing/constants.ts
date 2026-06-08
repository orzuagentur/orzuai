export const LANDING_COPY = {
  tagline: "The AI inbox for WhatsApp, Instagram, Telegram, and your website.",
  subtitle:
    "Unify customer conversations, automate replies with AI trained on your business knowledge, and grow faster — all from one dashboard.",
  startButton: "START",
  modalTitle: "Welcome to OrzuX",
  modalDescription:
    "Sign in or create an account to launch your multi-channel AI assistant.",
} as const;

export const LANDING_FEATURES = [
  "WhatsApp & Instagram",
  "Telegram & Web forms",
  "AI-powered replies",
] as const;

export const LANDING_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "telegram", label: "Telegram" },
  { id: "website_forms", label: "Website Forms" },
] as const;

export const LANDING_HEADER = {
  login: "Log in",
  startFree: "Start free",
  bookDemo: "Book a demo",
} as const;

export const LANDING_BOOK_DEMO = {
  label: "Book a demo",
  href: "mailto:hello@orzuai.com?subject=OrzuX%20demo%20request",
} as const;

export const LANDING_PRODUCT = {
  title: "One dashboard for every conversation",
  subtitle:
    "Inbox, CRM, AI replies, and channel analytics — without switching between apps.",
  features: [
    "Unified multi-channel inbox",
    "AI trained on your knowledge",
    "Per-channel integrations wizard",
  ],
} as const;

export const LANDING_SOCIAL_PROOF = {
  title: "Trusted by growing teams",
  subtitle: "Small businesses use OrzuX to reply faster across every channel.",
  logos: ["Retail", "Clinics", "Agencies", "E-commerce", "Education"],
  testimonials: [
    {
      quote:
        "We connected WhatsApp in minutes and AI handles 70% of first replies.",
      author: "Sofia K.",
      role: "Boutique owner",
    },
    {
      quote:
        "One inbox for Instagram DMs and Telegram — our team finally stopped switching apps.",
      author: "Marco R.",
      role: "Agency founder",
    },
  ],
} as const;

export const LANDING_PRICING = {
  title: "Simple pricing to get started",
  subtitle: "Start free. Upgrade when your team and channels grow.",
  plans: [
    {
      id: "starter",
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for solo founders testing AI replies.",
      features: [
        "1 business profile",
        "WhatsApp or Instagram",
        "AI auto-replies",
        "Knowledge base",
      ],
      highlighted: true,
      cta: "Start free",
    },
    {
      id: "growth",
      name: "Growth",
      price: "$29",
      period: "/ month",
      description: "For teams managing multiple channels daily.",
      features: [
        "All Starter features",
        "Telegram + Website Forms",
        "Unified inbox",
        "Priority support",
      ],
      highlighted: false,
      cta: "Coming soon",
    },
  ],
} as const;

export const LANDING_FEATURE_COMPARISON = {
  title: "Why teams switch to OrzuX",
  subtitle:
    "ManyChat and Intercom are great at one channel or one use case. OrzuX unifies messaging + CRM + AI in one place.",
  columns: ["OrzuX", "ManyChat", "Intercom"] as const,
  rows: [
    {
      feature: "WhatsApp + Instagram + Telegram",
      orzuai: true,
      manychat: "partial",
      intercom: false,
    },
    {
      feature: "Unified inbox (all channels)",
      orzuai: true,
      manychat: false,
      intercom: "partial",
    },
    {
      feature: "AI replies trained on your knowledge",
      orzuai: true,
      manychat: "partial",
      intercom: true,
    },
    {
      feature: "Built-in CRM + lead score",
      orzuai: true,
      manychat: false,
      intercom: "partial",
    },
    {
      feature: "Website form leads in same inbox",
      orzuai: true,
      manychat: false,
      intercom: true,
    },
    {
      feature: "Free starter plan",
      orzuai: true,
      manychat: false,
      intercom: false,
    },
  ],
} as const;

export const LANDING_FAQ = {
  title: "Frequently asked questions",
  items: [
    {
      question: "Which channels does OrzuX support?",
      answer:
        "WhatsApp Business Cloud API, Instagram Direct, Telegram Bot API, and Website Forms leads — all in one inbox.",
    },
    {
      question: "Do I need a developer to connect WhatsApp?",
      answer:
        "No. Use the guided Integrations wizard to connect your Meta WhatsApp number and verify webhooks in a few steps.",
    },
    {
      question: "How does the AI learn about my business?",
      answer:
        "Add entries to Knowledge (FAQs, pricing, policies) or sync your website. Every reply uses that context per channel.",
    },
    {
      question: "Can humans take over a conversation?",
      answer:
        "Yes. Reply manually in the Inbox, toggle AI per channel, and use internal notes for your team.",
    },
    {
      question: "Is there a free plan?",
      answer:
        "Yes — the Starter plan is free so you can connect a channel and test AI replies before upgrading.",
    },
  ],
} as const;
