import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { getGeminiApiKey, hasGeminiEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const KNOWLEDGE_EMBEDDING_MODEL = "text-embedding-004";
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 768;

type MessagingDbClient = SupabaseClient<Database>;

export function buildKnowledgeEmbeddingText(input: {
  title: string;
  content: string;
  category?: string | null;
}): string {
  const category = input.category?.trim();

  return [
    input.title.trim(),
    category ? `Category: ${category}` : null,
    input.content.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function embedKnowledgeText(text: string): Promise<number[] | null> {
  if (!hasGeminiEnv()) {
    return null;
  }

  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const client = new GoogleGenerativeAI(getGeminiApiKey());
    const model = client.getGenerativeModel({ model: KNOWLEDGE_EMBEDDING_MODEL });
    const result = await model.embedContent(trimmed.slice(0, 8_000));
    const values = result.embedding.values;

    if (!values.length) {
      return null;
    }

    return values;
  } catch (error) {
    console.warn(
      "[knowledge-embedding]",
      JSON.stringify({
        error: error instanceof Error ? error.message : "embed_failed",
      }),
    );
    return null;
  }
}

export async function storeKnowledgeEntryEmbedding(
  admin: MessagingDbClient,
  input: {
    entryId: string;
    businessId: string;
    title: string;
    content: string;
    category?: string | null;
  },
): Promise<boolean> {
  const embedding = await embedKnowledgeText(
    buildKnowledgeEmbeddingText({
      title: input.title,
      content: input.content,
      category: input.category,
    }),
  );

  if (!embedding) {
    return false;
  }

  const { error } = await admin
    .from("knowledge_base")
    .update({
      embedding: JSON.stringify(embedding),
      embedding_model: KNOWLEDGE_EMBEDDING_MODEL,
    })
    .eq("id", input.entryId)
    .eq("business_id", input.businessId);

  if (error) {
    console.warn(
      "[knowledge-embedding]",
      JSON.stringify({ error: error.message, entryId: input.entryId }),
    );
    return false;
  }

  return true;
}

export async function reindexMissingKnowledgeEmbeddings(input: {
  admin: MessagingDbClient;
  businessId?: string;
  limit?: number;
}): Promise<{ indexed: number; failed: number }> {
  const limit = input.limit ?? 50;
  let query = input.admin
    .from("knowledge_base")
    .select("id, business_id, title, content, category")
    .is("embedding", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.businessId) {
    query = query.eq("business_id", input.businessId);
  }

  const { data } = await query;

  let indexed = 0;
  let failed = 0;

  for (const entry of data ?? []) {
    const ok = await storeKnowledgeEntryEmbedding(input.admin, {
      entryId: entry.id,
      businessId: entry.business_id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
    });

    if (ok) {
      indexed += 1;
    } else {
      failed += 1;
    }
  }

  return { indexed, failed };
}
