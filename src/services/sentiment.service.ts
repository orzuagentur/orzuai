import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/services/llm.service";
import { getSalesAgentSettings } from "@/services/sales-agent.service";

type MessagingDbClient = ReturnType<typeof createAdminClient>;

export type ContactSentiment = "positive" | "neutral" | "negative";

const POSITIVE_HINTS = [
  "thanks",
  "thank you",
  "great",
  "perfect",
  "awesome",
  "love",
  "excellent",
  "happy",
  "спасибо",
  "отлично",
  "rahmat",
];

const NEGATIVE_HINTS = [
  "angry",
  "upset",
  "bad",
  "terrible",
  "refund",
  "complaint",
  "worst",
  "hate",
  "problem",
  "issue",
  "плохо",
  "жалоба",
  "muammo",
];

function heuristicSentiment(message: string): ContactSentiment {
  const lower = message.toLowerCase();

  const positiveScore = POSITIVE_HINTS.filter((hint) =>
    lower.includes(hint),
  ).length;
  const negativeScore = NEGATIVE_HINTS.filter((hint) =>
    lower.includes(hint),
  ).length;

  if (negativeScore > positiveScore) {
    return "negative";
  }

  if (positiveScore > negativeScore) {
    return "positive";
  }

  return "neutral";
}

function parseSentimentLabel(text: string): ContactSentiment | null {
  const normalized = text.trim().toLowerCase();

  if (normalized.includes("positive")) {
    return "positive";
  }

  if (normalized.includes("negative")) {
    return "negative";
  }

  if (normalized.includes("neutral")) {
    return "neutral";
  }

  return null;
}

export async function analyzeAndStoreSentiment(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  message: string;
}): Promise<ContactSentiment | null> {
  const settings = await getSalesAgentSettings(input.businessId);

  if (!settings.sentimentAnalysisEnabled) {
    return null;
  }

  let sentiment = heuristicSentiment(input.message);

  const aiResult = await generateText({
    businessId: input.businessId,
    skipUsageLog: true,
    prompt: `Classify customer message sentiment.\nMessage: ${input.message}`,
    systemInstruction:
      "Reply with exactly one word: positive, neutral, or negative.",
  });

  if (aiResult.success) {
    const parsed = parseSentimentLabel(aiResult.data.text);
    if (parsed) {
      sentiment = parsed;
    }
  }

  if (!hasSupabaseEnv()) {
    return sentiment;
  }

  await input.admin
    .from("contacts")
    .update({ sentiment })
    .eq("id", input.contactId)
    .eq("business_id", input.businessId);

  return sentiment;
}
