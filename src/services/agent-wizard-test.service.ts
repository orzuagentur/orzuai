import "server-only";

import type { AiProvider } from "@/lib/ai/constants";
import { buildCustomerAgentSystemPrompt } from "@/lib/ai-assistant/build-agent-system-prompt";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveKnowledgeForMessage } from "@/services/knowledge-retrieval.service";
import {
  generateAssistantReplyWithFallback,
  isProviderConfigured,
} from "@/services/llm.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { TestAgentWizardReplyInput } from "@/types/ai-agent.types";
import { testAgentWizardReplySchema } from "@/types/ai-agent.types";
import type { RoutableAiAgent } from "@/utils/ai-agent-routing";

export async function testAgentWizardReply(
  input: TestAgentWizardReplyInput,
): Promise<
  | { success: true; reply: string; provider: AiProvider; model: string }
  | { success: false; message: string }
> {
  const parsed = testAgentWizardReplySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid test input.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const admin = createAdminClient();
  const draftAgent: RoutableAiAgent = {
    id: "wizard-test",
    name: parsed.data.name,
    systemPrompt: parsed.data.systemPrompt,
    channels: [parsed.data.channel],
    triggerKeywords: [],
    enabled: true,
    goal: parsed.data.goal,
    provider: parsed.data.provider,
    model: parsed.data.model,
    language: parsed.data.language,
    communicationStyle: parsed.data.communicationStyle,
    useCustomModel: false,
  };

  const knowledgeEntries = await retrieveKnowledgeForMessage({
    admin,
    businessId: business.id,
    query: parsed.data.testMessage,
  });

  const reply = await generateAssistantReplyWithFallback({
    businessId: business.id,
    callType: "auto_reply",
    preferredProvider: parsed.data.provider,
    model: parsed.data.model,
    systemPrompt: buildCustomerAgentSystemPrompt(draftAgent),
    language: parsed.data.language,
    userMessage: parsed.data.testMessage,
    knowledgeContext: knowledgeEntries.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category ?? "",
    })),
    conversationHistory: parsed.data.conversationHistory ?? [],
  });

  if (!reply.success) {
    return {
      success: false,
      message: reply.error?.message ?? "Unable to generate test reply.",
    };
  }

  const usedProvider = reply.usedProvider ?? parsed.data.provider;

  if (!isProviderConfigured(usedProvider)) {
    return {
      success: false,
      message: `${usedProvider} API is not configured for this environment.`,
    };
  }

  return {
    success: true,
    reply: reply.data.text,
    provider: usedProvider,
    model: reply.data.model,
  };
}
