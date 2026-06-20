import "server-only";

import { generateText } from "@/services/llm.service";
import type { ContactSnapshot } from "@/services/agent-task-executor.service";
import {
  orchestratorResponseSchema,
  type OrchestratorResponse,
} from "@/types/ai-orchestrator.types";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

function parseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);

    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function buildOrchestratorPrompt(input: {
  message: string;
  conversationHistory: ConversationTurn[];
  contact: ContactSnapshot | null;
}): string {
  const historySection =
    input.conversationHistory.length > 0
      ? input.conversationHistory
          .slice(-8)
          .map(
            (turn) =>
              `${turn.role === "user" ? "Customer" : "Assistant"}: ${turn.content}`,
          )
          .join("\n")
      : "No prior messages.";

  const contactSection = input.contact
    ? JSON.stringify(
        {
          name: input.contact.name,
          phone: input.contact.phoneNumber,
          alternatePhones:
            input.contact.customFields.additionalContacts
              ?.filter((entry) => entry.type === "phone")
              .map((entry) => entry.value) ?? [],
          email: input.contact.email,
          company: input.contact.customFields.company ?? null,
          location: input.contact.customFields.location ?? null,
          pipelineStage: input.contact.pipelineStage,
          dealValue: input.contact.dealValue,
          tags: input.contact.tags,
        },
        null,
        2,
      )
    : null;

  return [
    "Analyze the customer's latest message for agent routing and CRM actions.",
    "",
    "Recent conversation:",
    historySection,
    "",
    "Latest customer message:",
    input.message,
    "",
    contactSection
      ? ["Current CRM contact:", contactSection, ""].join("\n")
      : "No CRM contact linked to this conversation — return empty actions.",
    "",
    "Return JSON only with this shape:",
    '{"intent":"general|booking|sales|support|registration|none","confidence":0.0,"needsHuman":false,"humanReason":"","contactUpdates":{},"actions":[],"clientSummary":""}',
    "",
    "Intent guide:",
    "- general: greetings, small talk, unclear intent",
    "- booking: schedule, appointment, reservation, visit time",
    "- sales: pricing, purchase, demo, product interest",
    "- support: help, issue, complaint, how-to",
    "- registration: sign up, enroll, create account, onboarding",
    "- none: spam or not actionable",
    "",
    "Human handoff (needsHuman):",
    "- Set needsHuman true when the customer asks for a real person, owner, manager, or human agent.",
    "- Set needsHuman true when the request is too complex, sensitive, angry, or outside what AI can safely handle.",
    "- humanReason: one short sentence explaining why a real person is needed (for the owner notification).",
    "- When needsHuman is true, still return intent and CRM actions when relevant.",
    "",
    "CRM rules (only when contact is present):",
    "- booking/support intent: prefer create_task and add_note",
    "- sales intent: prefer create_deal, create_task, add_note",
    "- general/none: add_note and contactUpdates only when customer shares new details",
    "- Do not invent contact data. Omit uncertain fields.",
    "- clientSummary: one short sentence describing CRM updates for the assistant reply.",
  ].join("\n");
}

export async function runAutoReplyOrchestrator(input: {
  businessId: string;
  message: string;
  conversationHistory?: ConversationTurn[];
  contact: ContactSnapshot | null;
}): Promise<OrchestratorResponse | null> {
  const conversationHistory = input.conversationHistory ?? [];

  const result = await generateText({
    businessId: input.businessId,
    provider: "gemini",
    skipUsageLog: true,
    skipUsageLimit: true,
    systemInstruction:
      "You route customer messages and plan CRM updates for a business inbox. Reply with valid JSON only. confidence is 0 to 1. Never invent contact details. Set needsHuman when a real business owner must join the chat.",
    prompt: buildOrchestratorPrompt({
      message: input.message,
      conversationHistory,
      contact: input.contact,
    }),
  });

  if (!result.success) {
    console.warn(
      "[ai-orchestrator]",
      JSON.stringify({ error: result.error.message }),
    );
    return null;
  }

  const parsed = parseJsonObject(result.data.text);

  if (!parsed) {
    return null;
  }

  const validated = orchestratorResponseSchema.safeParse(parsed);

  if (!validated.success) {
    console.warn(
      "[ai-orchestrator]",
      JSON.stringify({ error: "invalid_orchestrator_json" }),
    );
    return null;
  }

  console.info(
    "[ai-orchestrator]",
    JSON.stringify({
      intent: validated.data.intent,
      confidence: validated.data.confidence,
      needsHuman: validated.data.needsHuman,
      actionCount: validated.data.actions.length,
      hasContactUpdates: Boolean(
        validated.data.contactUpdates &&
          Object.keys(validated.data.contactUpdates).length > 0,
      ),
    }),
  );

  return validated.data;
}
