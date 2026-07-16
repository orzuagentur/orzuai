import "server-only";

import { createHash } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildKnowledgeCitation,
  selectBestKnowledgeChunk,
} from "@/lib/ai-assistant/knowledge-chunking";
import { rankKnowledgeEntries } from "@/lib/ai-assistant/knowledge-ranking";
import {
  getRedisCacheValue,
  setRedisCacheValue,
} from "@/lib/cache/redis";
import { GEMINI_MAX_KNOWLEDGE_ENTRIES } from "@/lib/gemini/constants";
import { embedKnowledgeText } from "@/services/knowledge-embedding.service";
import type { Database } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

export type RetrievedKnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  /** Short stable label for prompt grounding, e.g. KB-a1b2c3d4 */
  citation: string;
};

const KNOWLEDGE_CANDIDATE_LIMIT = 200;
const KNOWLEDGE_FALLBACK_LIMIT = 8;
const VECTOR_MATCH_LIMIT = 40;
const KNOWLEDGE_CACHE_TTL_SECONDS = 5 * 60;

type VectorMatchRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity: number;
};

function toRetrievedEntry(input: {
  id: string;
  title: string;
  content: string;
  category: string | null;
  query: string;
}): RetrievedKnowledgeEntry {
  return {
    id: input.id,
    title: input.title,
    content: selectBestKnowledgeChunk(input.content, input.query),
    category: input.category,
    citation: buildKnowledgeCitation(input.id),
  };
}

async function retrieveKnowledgeByEmbedding(input: {
  admin: MessagingDbClient;
  businessId: string;
  query: string;
  limit?: number;
}): Promise<RetrievedKnowledgeEntry[] | null> {
  const limit = input.limit ?? GEMINI_MAX_KNOWLEDGE_ENTRIES;
  const queryEmbedding = await embedKnowledgeText(input.query.trim(), {
    taskType: "RETRIEVAL_QUERY",
  });

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

  return (data as VectorMatchRow[]).map((entry) =>
    toRetrievedEntry({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category || null,
      query: input.query,
    }),
  );
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
    .select("id, title, content, category, updated_at")
    .eq("business_id", input.businessId)
    .order("updated_at", { ascending: false })
    .limit(KNOWLEDGE_CANDIDATE_LIMIT);

  const candidates =
    data?.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      updatedAt: entry.updated_at,
    })) ?? [];

  if (candidates.length === 0) {
    return [];
  }

  const ranked = rankKnowledgeEntries(candidates, input.query, limit);

  const source = ranked.length > 0
    ? ranked
    : candidates.slice(0, KNOWLEDGE_FALLBACK_LIMIT);

  return source.map((entry) =>
    toRetrievedEntry({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      query: input.query,
    }),
  );
}

function buildKnowledgeCacheKey(
  businessId: string,
  query: string,
  limit: number,
): string {
  const digest = createHash("sha256")
    .update(`${businessId}:${query.trim().toLowerCase()}:${limit}`)
    .digest("hex")
    .slice(0, 24);

  return `kb:retrieve:${digest}`;
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

  const cacheKey = buildKnowledgeCacheKey(input.businessId, trimmedQuery, limit);
  const cached = await getRedisCacheValue(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as RetrievedKnowledgeEntry[];

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, limit);
      }
    } catch {
      // Ignore corrupt cache and refresh below.
    }
  }

  const vectorEntries = await retrieveKnowledgeByEmbedding(input);

  // Vector hits are enough — skip the expensive 200-row keyword scan.
  let results: RetrievedKnowledgeEntry[];

  if (vectorEntries && vectorEntries.length >= limit) {
    results = vectorEntries.slice(0, limit);
  } else if (vectorEntries && vectorEntries.length > 0) {
    results = vectorEntries.slice(0, limit);
  } else {
    results = await retrieveKnowledgeByKeyword(input);
  }

  if (results.length > 0) {
    void setRedisCacheValue(
      cacheKey,
      JSON.stringify(results),
      KNOWLEDGE_CACHE_TTL_SECONDS,
    );
  }

  return results;
}
