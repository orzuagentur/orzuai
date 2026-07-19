import { DOCS_ROUTES as APP_DOCS_ROUTES } from "@/constants/routes";

export type DocsNavItem = {
  slug: string;
  title: string;
  description: string;
};

export type DocsNavGroup = {
  title: string;
  items: DocsNavItem[];
};

export const DOCS_ROUTES = {
  root: APP_DOCS_ROUTES.root,
  page: APP_DOCS_ROUTES.page,
} as const;

export const DOCS_NAV: DocsNavGroup[] = [
  {
    title: "Company",
    items: [
      {
        slug: "about",
        title: "About OrzuX",
        description: "What OrzuX is, who it is for, and how we build it.",
      },
    ],
  },
  {
    title: "Getting started",
    items: [
      {
        slug: "getting-started",
        title: "Getting started",
        description: "Create a workspace and reach your first useful day.",
      },
      {
        slug: "account-and-sign-in",
        title: "Account & sign-in",
        description: "Email, Google, magic link, verification, and password reset.",
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        slug: "inbox",
        title: "Unified inbox",
        description: "Chats, favorites, and how conversations stay organized.",
      },
      {
        slug: "channels",
        title: "Channels",
        description: "WhatsApp, Telegram, Website Chat, Email, SMS, and forms.",
      },
      {
        slug: "orders",
        title: "Orders",
        description: "Manual orders and website form submissions in one place.",
      },
      {
        slug: "calls",
        title: "Calls AI",
        description: "Voice inbox, dialer, live monitor, and call history.",
      },
      {
        slug: "crm",
        title: "CRM & contacts",
        description: "Customer profiles, work panels, and conversation context.",
      },
      {
        slug: "calendar",
        title: "Calendar & booking",
        description: "Internal calendar, public booking pages, Google Calendar.",
      },
    ],
  },
  {
    title: "AI",
    items: [
      {
        slug: "ai-agent",
        title: "AI Agent",
        description: "How the agent replies, uses tools, and stays controllable.",
      },
      {
        slug: "knowledge-base",
        title: "Knowledge base",
        description: "Import, website crawl, generate, and organize knowledge.",
      },
      {
        slug: "human-handoff",
        title: "Human handoff",
        description: "When AI pauses and a teammate takes the conversation.",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        slug: "integrations",
        title: "Integrations marketplace",
        description: "Connect providers and activate channels for your business.",
      },
      {
        slug: "team",
        title: "Team & permissions",
        description: "Invites, roles, and shared workspace access.",
      },
      {
        slug: "analytics",
        title: "Analytics",
        description: "What the analytics views measure today.",
      },
      {
        slug: "billing",
        title: "Billing & usage",
        description: "Plans, invoices, payments, and channel add-ons.",
      },
    ],
  },
  {
    title: "Business use cases",
    items: [
      {
        slug: "use-cases",
        title: "Use cases overview",
        description: "Ten industries and how OrzuX typically helps each one.",
      },
      {
        slug: "clinics-and-medical",
        title: "Clinics & medical",
        description: "Appointments, FAQs, and after-hours coverage for clinics.",
      },
      {
        slug: "real-estate",
        title: "Real estate",
        description: "Lead qualification, viewings, and shared broker inbox.",
      },
      {
        slug: "hospitality-and-hotels",
        title: "Hospitality & hotels",
        description: "Guest messaging, pre-arrival FAQs, and shared front desk.",
      },
      {
        slug: "beauty-and-salons",
        title: "Beauty & salons",
        description: "Bookings, price FAQs, and client preferences.",
      },
      {
        slug: "home-services",
        title: "Home services",
        description: "Job intake, estimates, and field-team callbacks.",
      },
      {
        slug: "education-and-training",
        title: "Education & training",
        description: "Enrollment FAQs and consultation booking.",
      },
      {
        slug: "auto-and-dealerships",
        title: "Auto & dealerships",
        description: "Service booking and sales/service conversation history.",
      },
      {
        slug: "restaurants-and-cafes",
        title: "Restaurants & cafés",
        description: "Reservations, events, and guest FAQ load.",
      },
      {
        slug: "professional-services",
        title: "Professional services",
        description: "Intake, consult booking, and controlled AI FAQs.",
      },
      {
        slug: "fitness-and-wellness",
        title: "Fitness & wellness",
        description: "Trials, membership questions, and front-desk chat.",
      },
    ],
  },
  {
    title: "Trust",
    items: [
      {
        slug: "security-and-privacy",
        title: "Security & privacy",
        description: "Auth, cookies, data access, and legal documents.",
      },
    ],
  },
];

export function getAllDocsItems(): DocsNavItem[] {
  return DOCS_NAV.flatMap((group) => group.items);
}

export function getDocsItem(slug: string): DocsNavItem | undefined {
  return getAllDocsItems().find((item) => item.slug === slug);
}

export function getDocsSlugs(): string[] {
  return getAllDocsItems().map((item) => item.slug);
}
