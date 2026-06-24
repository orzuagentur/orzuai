import { DASHBOARD_ROUTES } from "@/constants/routes";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { PlatformCopilotMode } from "@/types/platform-copilot.types";

const INTEGRATION_CHANNELS = [
  "whatsapp",
  "telegram",
  "instagram",
  "email",
  "website_forms",
  "facebook_messenger",
] as const;

function buildRouteCatalog(): string {
  const mainRoutes = DASHBOARD_NAV_ITEMS.map(
    (item) => `- ${item.label}: ${item.href}`,
  );

  const integrationRoutes = INTEGRATION_CHANNELS.map(
    (channel) =>
      `- Integrations / ${channel}: ${DASHBOARD_ROUTES.integrations}/${channel}`,
  );

  return [
    ...mainRoutes,
    `- Calendar: ${DASHBOARD_ROUTES.calendar}`,
    `- Google Calendar integration: ${GOOGLE_CALENDAR_INTEGRATION_HREF}`,
    `- Onboarding: ${DASHBOARD_ROUTES.onboarding}`,
    `- Integrations hub: ${DASHBOARD_ROUTES.integrations}`,
    `- Marketplace: ${DASHBOARD_ROUTES.marketplace}`,
    ...integrationRoutes,
  ].join("\n");
}

export function buildPlatformCopilotAgentInstruction(
  mode: PlatformCopilotMode,
): string {
  const modeLine =
    mode === "full_access"
      ? "Mode: FULL ACCESS — you may propose real platform actions (contacts, messages, knowledge base, channels, calendar). Every action still needs user confirmation via button."
      : "Mode: CHAT — answer questions and navigate. For write/delete/send actions, explain what you would do and propose switching to Full Access mode, or only propose navigate actions.";

  return [
    "You are OrzuAI — an autonomous in-app operator for the OrzuX business CRM.",
    "Reply in the same language the user writes in (Russian or English).",
    modeLine,
    "",
    "You receive live business context: contacts, conversations, knowledge base, channels.",
    "Understand intent freely — do NOT require exact phrases.",
    "",
    "Capabilities (propose as actions, never execute yourself):",
    "- navigate: open a dashboard page",
    "- setup_calendar: analyze knowledge base and create booking resources (rooms, tables, staff)",
    "- create_knowledge_entry / delete_knowledge_entry",
    "- delete_contact",
    "- send_message: send text to a customer conversation (use conversationId from context)",
    `- toggle_channel_ai: enable/disable AI on channels (${MESSAGING_INTEGRATION_CHANNELS.join(", ")})`,
    "- web_research_kb: search the internet and create knowledge base entries",
    "",
    "When user asks to message a client:",
    "1. Find the best matching contact/conversation in context",
    "2. Draft the message",
    "3. Propose send_message action with conversationId and content",
  "",
    "When user asks about calendar/booking setup — propose setup_calendar even if knowledge base is sparse.",
    "When user asks to build knowledge base — ask at most 1-2 short clarifying questions in reply, then propose web_research_kb or create_knowledge_entry actions.",
    "",
    "Route catalog:",
    buildRouteCatalog(),
    "",
    "Respond with ONLY valid JSON:",
    "{",
    '  "reply": "helpful answer for the user",',
    '  "quickReplies": ["optional short follow-up the user can click"],',
    '  "actions": [',
    "    {",
    '      "id": "a1",',
    '      "type": "send_message",',
    '      "label": "Отправить клиенту",',
    '      "summary": "Отправить Ивану в WhatsApp: ...",',
    '      "params": { "conversationId": "uuid", "content": "...", "contactName": "Иван" }',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- actions array can be empty",
    "- every action needs clear label and summary for confirmation",
    "- use real IDs from context only — never invent UUIDs",
    "- max 4 quickReplies, max 6 actions",
    "- be concise in reply (2-5 sentences)",
  ].join("\n");
}

export function buildPlatformCopilotAgentPrompt(input: {
  question: string;
  currentPath: string;
  mode: PlatformCopilotMode;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  contextBlock: string;
}): string {
  const historyBlock =
    input.history.length > 0
      ? [
          "Recent conversation:",
          ...input.history.map((entry) => `${entry.role}: ${entry.content}`),
          "",
        ].join("\n")
      : "";

  return [
    historyBlock,
    `Current page: ${input.currentPath}`,
    `Copilot mode: ${input.mode}`,
    "",
    "Business context:",
    input.contextBlock,
    "",
    `User request: ${input.question}`,
  ].join("\n");
}
