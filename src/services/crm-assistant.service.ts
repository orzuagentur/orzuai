import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { generateText } from "@/services/llm.service";
import { z } from "zod";

export const conversationCrmAssistantSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
});

export type ConversationCrmAssistantInput = z.infer<
  typeof conversationCrmAssistantSchema
>;

export type ConversationCrmAssistantData = {
  contactId: string;
  contactName: string;
  leadScore: number | null;
  aiSummary: string | null;
  suggestedAction: string;
};

export type ConversationCrmAssistantResult =
  | { success: true; data: ConversationCrmAssistantData }
  | { success: false; error: { code: string; message: string } };

export async function getConversationCrmAssistant(
  input: ConversationCrmAssistantInput,
): Promise<ConversationCrmAssistantResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CHAT_MESSAGES.genericError },
    };
  }

  const parsed = conversationCrmAssistantSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: CHAT_MESSAGES.noBusinessDescription },
    };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, contact:contacts(id, name, lead_score, ai_summary)",
    )
    .eq("id", parsed.data.conversationId)
    .eq("business_id", business.id)
    .maybeSingle();

  const contact = Array.isArray(conversation?.contact)
    ? conversation.contact[0]
    : conversation?.contact;

  if (!conversation || !contact) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("content, sender_type, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const lastClientMessage = (messages ?? []).find(
    (message) => message.sender_type === "client",
  );

  let suggestedAction =
    "Review the latest customer message and reply with next steps.";

  if (hasGeminiEnv() && lastClientMessage) {
    const aiResult = await generateText({
      businessId: business.id,
      prompt: [
        "Suggest one concrete next action for a sales/support agent.",
        `Contact: ${contact.name}`,
        `Lead score: ${contact.lead_score ?? "unknown"}`,
        `Summary: ${contact.ai_summary ?? "none"}`,
        `Latest customer message: ${lastClientMessage.content}`,
        'Reply with one short imperative sentence, e.g. "Offer a demo call tomorrow."',
      ].join("\n"),
      systemInstruction:
        "You are a CRM copilot. Reply with a single actionable sentence only.",
    });

    if (aiResult.success && aiResult.data.text.trim()) {
      suggestedAction = aiResult.data.text.trim().slice(0, 280);
    }
  }

  return {
    success: true,
    data: {
      contactId: contact.id,
      contactName: contact.name,
      leadScore: contact.lead_score,
      aiSummary: contact.ai_summary,
      suggestedAction,
    },
  };
}
