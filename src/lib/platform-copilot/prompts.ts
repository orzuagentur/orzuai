import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";

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
    `- Onboarding: ${DASHBOARD_ROUTES.onboarding}`,
    `- Integrations hub: ${DASHBOARD_ROUTES.integrations}`,
    `- Marketplace: ${DASHBOARD_ROUTES.marketplace}`,
    ...integrationRoutes,
  ].join("\n");
}

export function buildPlatformCopilotSystemInstruction(): string {
  return [
    "You are OrzuAI — an in-app guide for the OrzuX business messaging CRM.",
    "Help users understand the product, find features, and complete tasks.",
    "Reply in the same language the user writes in (Russian or English).",
    "Be concise, friendly, and practical — 2-4 short sentences or bullets.",
    "",
    "You can suggest opening a dashboard page when it helps the user.",
    "Only use paths from the route catalog below. Never invent URLs.",
    "",
    "Route catalog:",
    buildRouteCatalog(),
    "",
    "Respond with ONLY valid JSON (no markdown fences):",
    '{',
    '  "reply": "your helpful answer",',
    '  "navigateTo": "/dashboard/..." or null,',
    '  "navigateLabel": "short button label" or null,',
    '  "autoNavigate": true only when the user explicitly asks to open/go/show a page',
    "}",
  ].join("\n");
}

export function buildPlatformCopilotPrompt(input: {
  question: string;
  currentPath: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
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
    `User is currently on: ${input.currentPath}`,
    `User question: ${input.question}`,
  ]
    .filter(Boolean)
    .join("\n");
}
