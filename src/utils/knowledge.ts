import type { KnowledgeEntry } from "@/types/database.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";
import type { KnowledgeEntryMetadata } from "@/types/knowledge-category.types";

function parseMetadata(value: unknown): KnowledgeEntryMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const metadata: KnowledgeEntryMetadata = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string") {
      metadata[key] = entry;
    }
  }
  return metadata;
}

export function mapKnowledgeEntry(entry: KnowledgeEntry): KnowledgeEntryData {
  const source =
    entry.source === "website_sync" ? "website_sync" : ("manual" as const);

  return {
    id: entry.id,
    businessId: entry.business_id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    source,
    sourceUrl: entry.source_url ?? null,
    metadata: parseMetadata(entry.metadata),
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

export function truncateKnowledgeContent(content: string, maxLength = 160): string {
  const trimmed = content.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function buildKnowledgeSearchPattern(query: string): string {
  return `%${query.trim().replace(/[%_\\]/g, "\\$&")}%`;
}
