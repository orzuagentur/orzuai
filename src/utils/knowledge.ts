import type { KnowledgeEntry } from "@/types/database.types";
import type { KnowledgeEntryData } from "@/types/knowledge.types";

export function mapKnowledgeEntry(entry: KnowledgeEntry): KnowledgeEntryData {
  return {
    id: entry.id,
    businessId: entry.business_id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
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
