import { USE_CASE_ARTICLES } from "@/features/docs/use-cases";
import type { DocsArticle, DocsSection } from "@/features/docs/types";

export type { DocsArticle, DocsSection };

export const DOCS_OVERVIEW = {
  title: "OrzuX documentation",
  summary:
    "Practical guides for the product that exists today — inbox, channels, AI agent, CRM, calendar, calls, team, billing, and industry use cases. Written for operators and founders, not marketing slides.",
  updatedLabel: "Updated July 2026",
} as const;

const CORE_DOCS_ARTICLES: Record<string, DocsArticle> = {
  about: {
    slug: "about",
    title: "About OrzuX",
    summary:
      "OrzuX is an AI business communication platform: one workspace for customer messages, calls, CRM context, bookings, and a controllable AI agent.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["getting-started", "ai-agent", "security-and-privacy"],
    sections: [
      {
        heading: "What we build",
        body: [
          "OrzuX (also referred to as OrzuAI in engineering contexts) is a multi-channel operations platform. Teams run customer conversations from a shared inbox, keep contact context in CRM, book appointments on a calendar, handle voice calls, and optionally let an AI agent reply with knowledge and tools — while humans stay able to take over.",
          "We focus on shipping a coherent workspace, not a loose collection of chat widgets. If a channel or feature is documented here, it is implemented in the product. If something is experimental or not available, we say so.",
        ],
      },
      {
        heading: "Who it is for",
        body: [
          "OrzuX fits small and mid-size teams that sell or support over messaging and phone: clinics, agencies, hospitality, real estate, local services, and B2B sales/support desks.",
        ],
        bullets: [
          "Operators who need one inbox across WhatsApp, Telegram, website chat, email, and related channels",
          "Founders who want AI coverage without losing human control",
          "Teams that need CRM, booking, and call history next to the conversation — not in separate tools",
        ],
      },
      {
        heading: "What OrzuX is not",
        body: [
          "It is not a generic chatbot plugin that only pastes replies into a third-party messenger. It is not a full ERP, accounting suite, or social media scheduler.",
          "Channel coverage depends on what you connect in Integrations. Marketing pages may mention channels that require provider setup; this documentation stays tied to the live marketplace and dashboard routes.",
        ],
      },
      {
        heading: "How the product is structured",
        body: [
          "After sign-in you land in a business workspace with navigation for Chats, Orders, Calls AI, CRM, Calendar, AI Agent, Analytics, Team, Integrations, Settings, and Subscription.",
          "Public surfaces include the marketing site, auth flows, legal pages, and customer booking pages at /book/[slug].",
        ],
      },
      {
        heading: "Principles we design for",
        body: [],
        bullets: [
          "Human control — AI can be limited, reviewed, and handed off",
          "One customer record — conversation context should not scatter across tabs",
          "Honest scope — document what ships; do not invent features for the docs",
          "Security defaults — authenticated access, business-scoped data, consent-aware analytics",
        ],
      },
    ],
  },

  "getting-started": {
    slug: "getting-started",
    title: "Getting started",
    summary:
      "From account creation to a usable workspace: sign up, verify email, connect a channel, and optionally enable the AI agent.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["account-and-sign-in", "integrations", "ai-agent"],
    sections: [
      {
        heading: "1. Create an account",
        body: [
          "Open Start free on the marketing site or go to /auth/register. You can sign up with email and password or continue with Google after accepting the Terms of Service and Privacy Policy.",
          "Password policy requires at least 5 letters, 3 symbols, and 2 digits. Email signup sends a one-time verification code.",
        ],
      },
      {
        heading: "2. Complete workspace basics",
        body: [
          "After verification you enter the dashboard. Use onboarding prompts where shown, set your business profile, and invite teammates when ready (Team).",
        ],
      },
      {
        heading: "3. Connect a channel",
        body: [
          "Open Integrations → Marketplace and activate a channel you actually use: WhatsApp, Telegram, Website Chat, Email, Voice, SMS, Website Forms, or Google Calendar.",
          "Until a channel is connected, the inbox for that channel stays empty. That is expected.",
        ],
      },
      {
        heading: "4. Optional: turn on AI",
        body: [
          "In AI Agent, configure settings, add knowledge, and enable the agent per channel. Start narrow (one channel, clear knowledge) before expanding.",
        ],
      },
      {
        heading: "Recommended first week",
        body: [],
        bullets: [
          "Connect one messaging channel and reply manually for a day",
          "Create a few CRM contacts from real conversations",
          "Add a booking page if you take appointments",
          "Add a short knowledge article before enabling AI replies",
          "Invite one teammate and test handoff",
        ],
      },
    ],
  },

  "account-and-sign-in": {
    slug: "account-and-sign-in",
    title: "Account & sign-in",
    summary:
      "How authentication works in OrzuX: email password, Google, magic link, verification, and password recovery.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["getting-started", "security-and-privacy", "team"],
    sections: [
      {
        heading: "Sign-in methods",
        body: [
          "Supported methods on /auth/login:",
        ],
        bullets: [
          "Email and password",
          "Continue with Google (OAuth)",
          "Sign in with email link (magic link) for existing accounts only",
        ],
      },
      {
        heading: "Magic link",
        body: [
          "Choose Sign in with email link, enter an email that already has an account, and open the link from your inbox. New accounts cannot be created through magic link alone.",
          "Delivery uses your configured email provider (Resend when configured, otherwise Supabase Auth email).",
        ],
      },
      {
        heading: "Verification and password reset",
        body: [
          "New email accounts must verify with a code from email before full access.",
          "Forgot password sends a recovery code; after verification you set a new password that meets the same strength rules as registration.",
        ],
      },
      {
        heading: "Team invites",
        body: [
          "Teammates join through invite links under Team. Accepting an invite attaches the user to the business workspace with the role granted by the inviter.",
        ],
      },
    ],
  },

  inbox: {
    slug: "inbox",
    title: "Unified inbox",
    summary:
      "The Chats area is the operational center for customer conversations across connected channels.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["channels", "crm", "human-handoff"],
    sections: [
      {
        heading: "What you see",
        body: [
          "Dashboard → Chats lists conversations for your business. You can filter by channel tabs, open favorites, and work a selected thread in the message panel.",
          "Realtime updates keep the list and open conversation current when Supabase Realtime is enabled for messaging tables.",
        ],
      },
      {
        heading: "Working a conversation",
        body: [
          "Open a thread to read history, send replies, and use channel-appropriate composers. Contact context is available alongside the chat so CRM details stay visible while you reply.",
        ],
      },
      {
        heading: "Favorites and focus",
        body: [
          "Mark important threads as favorites for faster return. Use channel tabs when you want to work one provider at a time.",
        ],
      },
      {
        heading: "Honest limits",
        body: [
          "The inbox only shows channels that are connected and receiving traffic. Delivery success depends on provider credentials and message status pipelines — failed outbound sends surface through delivery tracking, not as silent success.",
        ],
      },
    ],
  },

  channels: {
    slug: "channels",
    title: "Channels",
    summary:
      "Channel integrations available in the product marketplace and how they show up in the workspace.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["integrations", "inbox", "orders", "calls"],
    sections: [
      {
        heading: "Messaging channels",
        body: ["These appear under Messaging in the marketplace and feed the unified inbox:"],
        bullets: [
          "WhatsApp — business messaging via configured WhatsApp provider credentials",
          "Telegram — bot-based messaging for customer chats",
          "Website Chat — on-site chat widget conversations",
          "Email — inbound/outbound customer email in the workspace",
        ],
      },
      {
        heading: "Operations channels",
        body: ["These support adjacent workflows:"],
        bullets: [
          "Voice — Twilio-backed calling (see Calls AI)",
          "SMS — text messaging where configured",
          "Website Forms — form submissions that surface as orders/leads",
          "Google Calendar — calendar sync for scheduling workflows",
        ],
      },
      {
        heading: "Activation",
        body: [
          "Connect each channel from Integrations → Marketplace. Activation routes into the channel’s setup flow for that business. Permissions and credentials are scoped to your workspace.",
        ],
      },
      {
        heading: "What we do not claim here",
        body: [
          "Do not assume every social network is live. If a channel is not in the marketplace configuration, treat it as unavailable until it ships and appears there.",
        ],
      },
    ],
  },

  orders: {
    slug: "orders",
    title: "Orders",
    summary:
      "Orders bring website form leads and manually created orders into one operational list.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["channels", "crm", "inbox"],
    sections: [
      {
        heading: "Where to find it",
        body: [
          "Dashboard → Orders. The panel lists orders with source indicators, filters, and a detail view for status updates.",
        ],
      },
      {
        heading: "Sources",
        body: [],
        bullets: [
          "Website Forms — submissions from connected form integrations",
          "Manual — create an order from the Orders UI when a lead arrives offline or from another channel",
        ],
      },
      {
        heading: "Status updates",
        body: [
          "Order status can be updated from the detail panel. Use status changes to keep fulfillment and follow-up visible to the team without leaving the workspace.",
        ],
      },
    ],
  },

  calls: {
    slug: "calls",
    title: "Calls AI",
    summary:
      "Voice calling, history, and live monitoring for Twilio-connected workspaces.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["channels", "ai-agent", "integrations"],
    sections: [
      {
        heading: "Voice inbox",
        body: [
          "Dashboard → Calls AI (Voice) shows call history, dialer controls, and call detail. Connect Voice through Integrations and complete Twilio-related subscription/setup where required.",
        ],
      },
      {
        heading: "Live monitor",
        body: [
          "Calls AI → Monitor is for watching live call activity in the workspace. Use it when multiple agents handle inbound or outbound calls and supervisors need visibility.",
        ],
      },
      {
        heading: "AI voice",
        body: [
          "AI Agent includes a Voice section for voice-agent related settings. Treat AI voice as part of the agent configuration, separate from the human dialer UI.",
        ],
      },
      {
        heading: "Requirements",
        body: [
          "Voice features need valid Twilio credentials and the corresponding subscription/add-on configuration. Without them, call UI may load but cannot place or receive production calls.",
        ],
      },
    ],
  },

  crm: {
    slug: "crm",
    title: "CRM & contacts",
    summary:
      "Contacts store the shared customer record next to conversations and work activity.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["inbox", "calendar", "ai-agent"],
    sections: [
      {
        heading: "Contacts",
        body: [
          "Dashboard → CRM opens contact profiles. From a contact you can review identity details and work context (notes, tasks, and related activity depending on the panels enabled in your build).",
        ],
      },
      {
        heading: "Why CRM sits next to chat",
        body: [
          "OrzuX is designed so operators do not copy-paste customer details between tools. Opening a conversation should keep the person behind the thread visible.",
        ],
      },
      {
        heading: "Practical tips",
        body: [],
        bullets: [
          "Create or merge contacts early when a new phone/email appears",
          "Keep notes factual — AI and teammates both read the same record",
          "Use CRM when booking or following up so calendar events stay attached to a real person",
        ],
      },
    ],
  },

  calendar: {
    slug: "calendar",
    title: "Calendar & booking",
    summary:
      "Internal scheduling plus public booking pages customers can use without a dashboard login.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["crm", "integrations", "ai-agent"],
    sections: [
      {
        heading: "Workspace calendar",
        body: [
          "Dashboard → Calendar is the internal schedule for bookings, events, and tasks. Use it to see the day grid and create items your team owns.",
        ],
      },
      {
        heading: "Public booking pages",
        body: [
          "Booking pages live under Calendar → Booking. Customers open a public URL at /book/[slug] to request time without accessing your dashboard.",
        ],
      },
      {
        heading: "Google Calendar",
        body: [
          "Connect Google Calendar from the marketplace when you want external calendar sync as part of scheduling workflows. Connection quality depends on Google OAuth credentials configured for the environment.",
        ],
      },
    ],
  },

  "ai-agent": {
    slug: "ai-agent",
    title: "AI Agent",
    summary:
      "The AI Agent can reply on enabled channels using knowledge, tools, and channel settings — with human override.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["knowledge-base", "human-handoff", "channels"],
    sections: [
      {
        heading: "Where to configure",
        body: [
          "Dashboard → AI Agent covers settings, per-channel configuration, knowledge, and voice-related agent options.",
        ],
      },
      {
        heading: "What the agent can do",
        body: [
          "When enabled for a channel, the agent can draft and send replies using your knowledge base and registered tools (CRM updates, scheduling-related actions, and other workspace tools exposed to the orchestrator).",
          "Exact tool availability depends on what is registered in the product for your environment. Prefer testing on a single channel first.",
        ],
      },
      {
        heading: "Control model",
        body: [],
        bullets: [
          "Enable AI per channel — not forced globally without configuration",
          "Knowledge quality drives answer quality; empty knowledge produces weak replies",
          "Humans can take over; see Human handoff",
        ],
      },
      {
        heading: "Honest expectations",
        body: [
          "The agent is not guaranteed to be correct on every question. It follows your knowledge and prompts; it can misunderstand edge cases. Keep high-risk decisions (refunds, medical advice, legal commitments) behind human review.",
        ],
      },
    ],
  },

  "knowledge-base": {
    slug: "knowledge-base",
    title: "Knowledge base",
    summary:
      "Knowledge is the source material the AI Agent uses to answer accurately about your business.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["ai-agent", "getting-started"],
    sections: [
      {
        heading: "Ways to add knowledge",
        body: [
          "From AI Agent → Knowledge you can organize categories and add content via:",
        ],
        bullets: [
          "Import — bring documents into the knowledge store",
          "Website — pull content from site pages you choose",
          "Generate — create draft knowledge with AI assistance, then edit for accuracy",
        ],
      },
      {
        heading: "Quality checklist",
        body: [],
        bullets: [
          "Prefer short, factual articles over long marketing copy",
          "Include prices, hours, policies, and booking rules you want the AI to cite",
          "Remove outdated pages from crawl sources when offers change",
          "Review generated drafts before enabling them for replies",
        ],
      },
    ],
  },

  "human-handoff": {
    slug: "human-handoff",
    title: "Human handoff",
    summary:
      "Keep AI useful without trapping customers in an automated loop when a person should respond.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["ai-agent", "inbox", "team"],
    sections: [
      {
        heading: "Why handoff exists",
        body: [
          "OrzuX is built for controllable AI. When a conversation needs judgment, empathy, or exception handling, a teammate should own the thread in the inbox.",
        ],
      },
      {
        heading: "How teams typically use it",
        body: [],
        bullets: [
          "AI handles FAQs and booking intake on enabled channels",
          "Escalation or explicit customer request moves the thread to a human",
          "Operators continue in Chats with full history visible",
        ],
      },
      {
        heading: "Notifications",
        body: [
          "The workspace surfaces AI-related request notifications so teammates notice when attention is needed. Keep notification settings current under Settings.",
        ],
      },
    ],
  },

  integrations: {
    slug: "integrations",
    title: "Integrations marketplace",
    summary:
      "The marketplace is the catalog of connectable channels and services for your business.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["channels", "billing", "calls"],
    sections: [
      {
        heading: "Open the marketplace",
        body: [
          "Dashboard → Integrations → Marketplace (also linked from the marketing Services menu). Each card opens the activation path for that channel.",
        ],
      },
      {
        heading: "What activation means",
        body: [
          "Activation stores provider credentials and enables routing for that business. Until activation completes, inbound traffic for that channel will not appear in the inbox.",
        ],
      },
      {
        heading: "Provider accounts",
        body: [
          "Some channels require third-party accounts (Meta/WhatsApp, Telegram BotFather, Twilio, Google, email providers). OrzuX does not replace those accounts; it connects them.",
        ],
      },
    ],
  },

  team: {
    slug: "team",
    title: "Team & permissions",
    summary:
      "Invite coworkers into the same business workspace with role-based access.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["account-and-sign-in", "human-handoff", "billing"],
    sections: [
      {
        heading: "Invites",
        body: [
          "Dashboard → Team lets owners/admins invite members by email. Invitees accept via the team invite auth flow and then access the shared dashboard.",
        ],
      },
      {
        heading: "Permissions",
        body: [
          "Access to sensitive areas (billing, integrations, team management) depends on role permissions enforced in the product. If a menu item is hidden or blocked, the signed-in role likely lacks that permission.",
        ],
      },
      {
        heading: "Team onboarding",
        body: [
          "Use team onboarding flows where available so new members understand channel coverage and AI rules before they start replying.",
        ],
      },
    ],
  },

  analytics: {
    slug: "analytics",
    title: "Analytics",
    summary:
      "Analytics summarizes workspace activity so you can see volume and outcomes without exporting raw logs.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["inbox", "calls", "billing"],
    sections: [
      {
        heading: "Where to look",
        body: [
          "Dashboard → Analytics. Charts and summaries reflect the metrics implemented for your workspace (conversation volume, channel mix, and related operational stats).",
        ],
      },
      {
        heading: "How to use it honestly",
        body: [
          "Treat analytics as a directional view of platform activity, not a certified financial report. For billing amounts and invoices, use Subscription.",
        ],
      },
    ],
  },

  billing: {
    slug: "billing",
    title: "Billing & usage",
    summary:
      "Subscription, usage, invoices, payments, and channel add-ons for WhatsApp and Twilio where applicable.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["integrations", "team", "getting-started"],
    sections: [
      {
        heading: "Subscription area",
        body: [
          "Dashboard → Subscription covers plan selection, usage, invoices, and payments. Channel-specific add-ons (for example WhatsApp or Twilio-related billing pages) live under the same section when enabled.",
        ],
      },
      {
        heading: "What affects cost",
        body: [
          "Pricing on the marketing site describes start-free and scale-by-usage models. Actual charges depend on the plan you select, seats, and provider usage (messaging/voice) billed through OrzuX and/or the underlying providers.",
        ],
      },
      {
        heading: "If access is limited",
        body: [
          "Past-due or suspended workspaces may be redirected to billing or a suspended state until the account is restored. Resolve invoices under Subscription before expecting full channel delivery.",
        ],
      },
    ],
  },

  "security-and-privacy": {
    slug: "security-and-privacy",
    title: "Security & privacy",
    summary:
      "How OrzuX approaches authentication, cookie consent, data access, and legal documents.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: ["account-and-sign-in", "about"],
    sections: [
      {
        heading: "Authentication",
        body: [
          "Sessions are handled through Supabase Auth. Protected dashboard routes require a signed-in user. Business data access is scoped by workspace membership and role checks in application services.",
        ],
      },
      {
        heading: "Cookies and analytics",
        body: [
          "The site shows a cookie preference banner. Necessary cookies stay on. Analytics (Google Analytics) and preference cookies load only after you enable those categories. Declining optional cookies keeps measurement off.",
        ],
      },
      {
        heading: "Legal documents",
        body: [
          "Binding legal terms live outside this documentation:",
        ],
        bullets: [
          "Privacy Policy — /privacy",
          "Terms of Service — /terms",
          "User Data Deletion — /data-deletion",
        ],
      },
      {
        heading: "Your responsibilities",
        body: [
          "You are responsible for lawful use of customer messaging channels, obtaining required customer consents for WhatsApp/SMS/voice where regulations apply, and keeping teammate access limited to people who should see customer data.",
        ],
      },
    ],
  },
};

export const DOCS_ARTICLES: Record<string, DocsArticle> = {
  ...CORE_DOCS_ARTICLES,
  ...USE_CASE_ARTICLES,
};

export function getDocsArticle(slug: string): DocsArticle | undefined {
  return DOCS_ARTICLES[slug];
}
