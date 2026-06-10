import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  HeadphonesIcon,
  MessageSquareIcon,
  PhoneCallIcon,
  TargetIcon,
  WrenchIcon,
} from "lucide-react";

import type { AiProvider } from "@/lib/ai/constants";
import { AI_PROVIDER_LABELS, getDefaultModelForProvider } from "@/lib/ai/constants";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { MessagingChannel } from "@/types/database.types";

import type { AiAgentTemplateDraft } from "./agent-templates";

export type AgentMarketplaceCategoryId =
  | "messaging_sms"
  | "voice"
  | "sales"
  | "support"
  | "booking"
  | "custom";

export type AgentMarketplaceCategory = {
  id: AgentMarketplaceCategoryId;
  label: string;
  description: string;
};

export type AgentMarketplaceTemplate = {
  id: string;
  categoryId: AgentMarketplaceCategoryId;
  name: string;
  description: string;
  icon: LucideIcon;
  recommendedProvider: AiProvider;
  recommendedModel?: string;
  providerBadge: string;
  channels: MessagingChannel[];
  draft: AiAgentTemplateDraft;
  integrationHref?: string;
  integrationLabel?: string;
};

export const AGENT_MARKETPLACE_CATEGORIES: AgentMarketplaceCategory[] = [
  {
    id: "messaging_sms",
    label: "Messaging & SMS",
    description: "Auto-replies for WhatsApp, Telegram, Instagram, and web forms.",
  },
  {
    id: "voice",
    label: "Voice assistant",
    description: "AI scripts for inbound calls and outbound lead callbacks.",
  },
  {
    id: "sales",
    label: "Sales & leads",
    description: "Qualify leads, nurture intent, and move deals forward.",
  },
  {
    id: "support",
    label: "Customer support",
    description: "Answer FAQs and escalate when a human is needed.",
  },
  {
    id: "booking",
    label: "Booking & scheduling",
    description: "Capture appointments and confirm availability.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start from a blank agent and configure everything yourself.",
  },
];

export const AGENT_MARKETPLACE_TEMPLATES: AgentMarketplaceTemplate[] = [
  {
    id: "whatsapp-inbox",
    categoryId: "messaging_sms",
    name: "WhatsApp Inbox Agent",
    description: "Fast, natural replies for WhatsApp Business conversations.",
    icon: MessageSquareIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    providerBadge: "OpenAI · SMS optimized",
    channels: ["whatsapp"],
    draft: {
      name: "WhatsApp Inbox Agent",
      systemPrompt:
        "You are a WhatsApp business assistant. Reply in short, friendly messages. Use the knowledge base for product answers. Ask one clear follow-up question when details are missing.",
      triggerKeywords: [],
      enabled: false,
    },
  },
  {
    id: "telegram-inbox",
    categoryId: "messaging_sms",
    name: "Telegram Agent",
    description: "Handle Telegram chats with concise, helpful responses.",
    icon: MessageSquareIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    providerBadge: "OpenAI · SMS optimized",
    channels: ["telegram"],
    draft: {
      name: "Telegram Agent",
      systemPrompt:
        "You are a Telegram support assistant. Keep messages brief and scannable. Answer from the knowledge base and offer human help for complex cases.",
      triggerKeywords: [],
      enabled: false,
    },
  },
  {
    id: "instagram-dm",
    categoryId: "messaging_sms",
    name: "Instagram DM Agent",
    description: "Respond to Instagram Direct messages and capture leads.",
    icon: MessageSquareIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    providerBadge: "OpenAI · SMS optimized",
    channels: ["instagram"],
    draft: {
      name: "Instagram DM Agent",
      systemPrompt:
        "You are an Instagram DM assistant for a business account. Be warm and concise. Guide interested users toward booking or leaving contact details.",
      triggerKeywords: ["price", "info", "dm", "buy"],
      enabled: false,
    },
  },
  {
    id: "website-form-lead",
    categoryId: "messaging_sms",
    name: "Website Form Lead Agent",
    description: "Follow up on website form submissions instantly.",
    icon: MessageSquareIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    providerBadge: "OpenAI · SMS optimized",
    channels: ["website_forms"],
    draft: {
      name: "Website Form Lead Agent",
      systemPrompt:
        "You follow up on website form leads. Thank the visitor, confirm their request, and ask one qualifying question to move the conversation forward.",
      triggerKeywords: [],
      enabled: false,
    },
  },
  {
    id: "voice-inbound",
    categoryId: "voice",
    name: "Inbound Voice Agent",
    description: "Answer calls and collect caller intent with AI voice.",
    icon: PhoneCallIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o",
    providerBadge: "OpenAI · Voice scripts",
    channels: ["website_forms"],
    integrationHref: `${DASHBOARD_ROUTES.integrations}/voice?section=activate`,
    integrationLabel: "Connect AI Voice",
    draft: {
      name: "Inbound Voice Agent",
      systemPrompt:
        "You are an AI voice receptionist. Greet callers professionally, understand their need in one or two sentences, and route or capture contact details for follow-up.",
      triggerKeywords: ["call", "phone", "speak"],
      enabled: false,
    },
  },
  {
    id: "voice-outbound",
    categoryId: "voice",
    name: "Outbound Callback Agent",
    description: "Call new leads after form submissions or missed chats.",
    icon: PhoneCallIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o",
    providerBadge: "OpenAI · Voice scripts",
    channels: ["website_forms"],
    integrationHref: `${DASHBOARD_ROUTES.integrations}/voice?section=activate`,
    integrationLabel: "Connect AI Voice",
    draft: {
      name: "Outbound Callback Agent",
      systemPrompt:
        "You place friendly outbound callback calls to new leads. Confirm their interest, answer basic questions, and schedule next steps without being pushy.",
      triggerKeywords: ["callback", "call me", "phone"],
      enabled: false,
    },
  },
  {
    id: "sales-bant",
    categoryId: "sales",
    name: "BANT Sales Agent",
    description: "Score Budget, Authority, Need, and Timeline on every message.",
    icon: TargetIcon,
    recommendedProvider: "claude",
    recommendedModel: "claude-3-5-sonnet-latest",
    providerBadge: "Claude · Sales reasoning",
    channels: ["whatsapp", "telegram", "instagram", "website_forms"],
    draft: {
      name: "BANT Sales Agent",
      systemPrompt:
        "You are a BANT sales assistant. Assess Budget, Authority, Need, and Timeline from each message. Qualify leads, answer product questions using the knowledge base, and suggest booking a call when intent is high.",
      triggerKeywords: ["price", "buy", "demo", "cost", "budget", "decision"],
      enabled: false,
    },
  },
  {
    id: "sales-nurture",
    categoryId: "sales",
    name: "Lead Nurture Agent",
    description: "Re-engage warm leads with helpful follow-ups.",
    icon: TargetIcon,
    recommendedProvider: "claude",
    recommendedModel: "claude-3-5-haiku-latest",
    providerBadge: "Claude · Fast nurture",
    channels: ["whatsapp", "telegram", "website_forms"],
    draft: {
      name: "Lead Nurture Agent",
      systemPrompt:
        "You nurture warm leads with helpful, non-pushy follow-ups. Reference prior context, offer value from the knowledge base, and invite the next step when timing feels right.",
      triggerKeywords: ["interested", "later", "thinking", "follow up"],
      enabled: false,
    },
  },
  {
    id: "support-faq",
    categoryId: "support",
    name: "FAQ Support Agent",
    description: "Resolve common questions from your knowledge base.",
    icon: HeadphonesIcon,
    recommendedProvider: "gemini",
    providerBadge: "Gemini · Cost efficient",
    channels: ["whatsapp", "telegram", "instagram", "website_forms"],
    draft: {
      name: "FAQ Support Agent",
      systemPrompt:
        "You are a customer support agent. Answer common questions from the knowledge base. If the issue needs a human, acknowledge it and ask for details.",
      triggerKeywords: ["help", "issue", "problem", "support", "how"],
      enabled: false,
    },
  },
  {
    id: "support-escalation",
    categoryId: "support",
    name: "Escalation Agent",
    description: "Detect frustration and route to a human quickly.",
    icon: HeadphonesIcon,
    recommendedProvider: "gemini",
    providerBadge: "Gemini · Cost efficient",
    channels: ["whatsapp", "telegram", "instagram"],
    draft: {
      name: "Escalation Agent",
      systemPrompt:
        "You handle upset or urgent customers. Acknowledge emotion, summarize the issue, and escalate to a human teammate with clear context when you cannot resolve it.",
      triggerKeywords: ["urgent", "angry", "manager", "complaint", "refund"],
      enabled: false,
    },
  },
  {
    id: "booking-agent",
    categoryId: "booking",
    name: "Appointment Booking Agent",
    description: "Collect date, time, and contact details for bookings.",
    icon: CalendarIcon,
    recommendedProvider: "openai",
    recommendedModel: "gpt-4o-mini",
    providerBadge: "OpenAI · Structured chat",
    channels: ["whatsapp", "telegram", "website_forms"],
    draft: {
      name: "Appointment Booking Agent",
      systemPrompt:
        "You help customers schedule appointments. Collect preferred date, time, and contact details. Confirm availability politely and recap the booking clearly.",
      triggerKeywords: ["book", "appointment", "schedule", "reserve", "slot"],
      enabled: false,
    },
  },
  {
    id: "custom-blank",
    categoryId: "custom",
    name: "Blank agent",
    description: "Full control over instructions, channels, and AI model.",
    icon: WrenchIcon,
    recommendedProvider: "gemini",
    providerBadge: "Your choice",
    channels: ["whatsapp"],
    draft: {
      name: "Custom agent",
      systemPrompt:
        "You are a helpful business assistant. Answer customer questions clearly and professionally using the knowledge base. Escalate to a human when the request is complex or sensitive.",
      triggerKeywords: [],
      enabled: false,
    },
  },
];

export function getAgentMarketplaceTemplate(
  templateId: string,
): AgentMarketplaceTemplate | undefined {
  return AGENT_MARKETPLACE_TEMPLATES.find((template) => template.id === templateId);
}

export function getAgentTemplatesByCategory(
  categoryId: AgentMarketplaceCategoryId,
): AgentMarketplaceTemplate[] {
  return AGENT_MARKETPLACE_TEMPLATES.filter(
    (template) => template.categoryId === categoryId,
  );
}

export function resolveTemplateAiConfig(
  template: AgentMarketplaceTemplate,
  availability: Record<AiProvider, boolean>,
): { provider: AiProvider; model: string } {
  if (availability[template.recommendedProvider]) {
    return {
      provider: template.recommendedProvider,
      model:
        template.recommendedModel ??
        getDefaultModelForProvider(template.recommendedProvider),
    };
  }

  const order: AiProvider[] = ["openai", "gemini", "claude"];

  for (const provider of order) {
    if (availability[provider]) {
      return {
        provider,
        model: getDefaultModelForProvider(provider),
      };
    }
  }

  return {
    provider: template.recommendedProvider,
    model:
      template.recommendedModel ??
      getDefaultModelForProvider(template.recommendedProvider),
  };
}

export function getProviderBadgeLabel(provider: AiProvider): string {
  return AI_PROVIDER_LABELS[provider];
}
