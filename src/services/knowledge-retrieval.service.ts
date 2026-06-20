import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { GEMINI_MAX_KNOWLEDGE_ENTRIES } from "@/lib/gemini/constants";
import { rankKnowledgeEntries } from "@/lib/ai-assistant/knowledge-ranking";
import type { Database } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

export type RetrievedKnowledgeEntry = {
  title: string;
  content: string;
  category: string | null;
};

const KNOWLEDGE_CANDIDATE_LIMIT = 200;
const KNOWLEDGE_FALLBACK_LIMIT = 8;

export async function retrieveKnowledgeForMessage(input: {
  admin: MessagingDbClient;
  businessId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedKnowledgeEntry[]> {
  const limit = input.limit ?? GEMINI_MAX_KNOWLEDGE_ENTRIES;
  const trimmedQuery = input.query.trim();

  const { data } = await input.admin
    .from("knowledge_base")
    .select("title, content, category, updated_at")
    .eq("business_id", input.businessId)
    .order("updated_at", { ascending: false })
    .limit(KNOWLEDGE_CANDIDATE_LIMIT);

  const candidates =
    data?.map((entry) => ({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      updatedAt: entry.updated_at,
    })) ?? [];

  if (candidates.length === 0) {
    return [];
  }

  const ranked = rankKnowledgeEntries(candidates, trimmedQuery, limit);

  if (ranked.length > 0) {
    return ranked.map(({ title, content, category }) => ({
      title,
      content,
      category,
    }));
  }

  return candidates.slice(0, KNOWLEDGE_FALLBACK_LIMIT).map((entry) => ({
    title: entry.title,
    content: entry.content,
    category: entry.category,
  }));
}
