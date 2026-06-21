import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { rankKnowledgeEntries } from "@/lib/ai-assistant/knowledge-ranking";
import { GEMINI_MAX_KNOWLEDGE_ENTRIES } from "@/lib/gemini/constants";
import {
  embedKnowledgeText,
} from "@/services/knowledge-embedding.service";
import type { Database } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

export type RetrievedKnowledgeEntry = {
  title: string;
  content: string;
  category: string | null;
};

const KNOWLEDGE_CANDIDATE_LIMIT = 200;
const KNOWLEDGE_FALLBACK_LIMIT = 8;
const VECTOR_MATCH_LIMIT = 40;

type VectorMatchRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
};

async function retrieveKnowledgeByEmbedding(input: {
  admin: MessagingDbClient;
  businessId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedKnowledgeEntry[] | null> {
  const limit = input.limit ?? GEMINI_MAX_KNOWLEDGE_ENTRIES;
  const queryEmbedding = await embedKnowledgeText(input.query.trim());

  if (!queryEmbedding) {
    return null;
  }

  const { data, error } = await input.admin.rpc("match_knowledge_by_embedding", {
    p_business_id: input.businessId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: Math.max(limit, VECTOR_MATCH_LIMIT),
  });

  if (error || !data?.length) {
    return null;
  }

  return (data as VectorMatchRow[]).map((entry) => ({
    title: entry.title,
    content: entry.content,
    category: entry.category || null,
  }));
}

async function retrieveKnowledgeByKeyword(input: {
  admin: MessagingDbClient;
  businessId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedKnowledgeEntry[]> {
  const limit = input.limit ?? GEMINI_MAX_KNOWLEDGE_ENTRIES;
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

  const ranked = rankKnowledgeEntries(candidates, input.query, limit);

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

function mergeKnowledgeResults(
  vectorEntries: RetrievedKnowledgeEntry[],
  keywordEntries: RetrievedKnowledgeEntry[],
  limit: number,
): RetrievedKnowledgeEntry[] {
  const merged = new Map<string, RetrievedKnowledgeEntry>();

  for (const entry of [...vectorEntries, ...keywordEntries]) {
    const key = `${entry.title}::${entry.content.slice(0, 64)}`;

    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }

  return [...merged.values()].slice(0, limit);
}

export async function retrieveKnowledgeForMessage(input: {
  admin: MessagingDbClient;
  businessId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedKnowledgeEntry[]> {
  const limit = input.limit ?? GEMINI_MAX_KNOWLEDGE_ENTRIES;
  const trimmedQuery = input.query.trim();

  if (!trimmedQuery) {
    return retrieveKnowledgeByKeyword(input);
  }

  const [vectorEntries, keywordEntries] = await Promise.all([
    retrieveKnowledgeByEmbedding(input),
    retrieveKnowledgeByKeyword(input),
  ]);

  if (vectorEntries && vectorEntries.length > 0) {
    return mergeKnowledgeResults(vectorEntries, keywordEntries, limit);
  }

  return keywordEntries;
}
