import type { CreateAiAgentInput } from "@/types/ai-agent.types";

export const AI_AGENT_TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  draft: Omit<CreateAiAgentInput, "channels"> & { channels?: CreateAiAgentInput["channels"] };
}> = [
  {
    id: "sales",
    label: "Sales agent",
    description: "Qualify leads and suggest next steps.",
    draft: {
      name: "Sales agent (BANT)",
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
] as const;
