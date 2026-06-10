export type AiAgentTemplateDraft = {
  name: string;
  systemPrompt: string;
  triggerKeywords: string[];
  enabled?: boolean;
};

export const AI_AGENT_TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  draft: AiAgentTemplateDraft;
}> = [
  {
    id: "sales",
    label: "Sales agent",
    description: "Qualify leads and suggest next steps.",
    draft: {
      name: "Sales agent",
      systemPrompt:
        "You are a BANT sales assistant. Assess Budget, Authority, Need, and Timeline from each message. Qualify leads, answer product questions using the knowledge base, and suggest booking a call when intent is high. Route pricing questions to a human when budget is unclear.",
      triggerKeywords: ["price", "buy", "demo", "cost", "budget", "decision"],
      enabled: true,
    },
  },
  {
    id: "support",
    label: "Support agent",
    description: "Resolve FAQs and escalate complex issues.",
    draft: {
      name: "Support agent",
      systemPrompt:
        "You are a customer support agent. Answer common questions from the knowledge base. If the issue needs a human, acknowledge it and ask for details.",
      triggerKeywords: ["help", "issue", "problem", "support"],
      enabled: true,
    },
  },
  {
    id: "booking",
    label: "Booking agent",
    description: "Capture appointment requests.",
    draft: {
      name: "Booking agent",
      systemPrompt:
        "You help customers schedule appointments. Collect preferred date, time, and contact details. Confirm availability politely.",
      triggerKeywords: ["book", "appointment", "schedule", "reserve"],
      enabled: true,
    },
  },
  {
    id: "custom",
    label: "Custom agent",
    description: "Write your own instructions from scratch.",
    draft: {
      name: "Custom agent",
      systemPrompt:
        "You are a helpful business assistant. Answer customer questions clearly and professionally using the knowledge base. Escalate to a human when the request is complex or sensitive.",
      triggerKeywords: [],
      enabled: true,
    },
  },
] as const;

export type AiAgentRoleId = (typeof AI_AGENT_TEMPLATES)[number]["id"];
