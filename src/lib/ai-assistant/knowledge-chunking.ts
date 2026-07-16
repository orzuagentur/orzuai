import { tokenizeKnowledgeQuery } from "@/lib/ai-assistant/knowledge-ranking";

/** Soft max for a single KB snippet injected into an LLM prompt. */
export const KNOWLEDGE_CHUNK_MAX_CHARS = 1_400;

function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreParagraph(paragraph: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const lower = paragraph.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (lower.includes(token)) {
      score += token.length >= 4 ? 2 : 1;
    }
  }

  return score;
}

/**
 * Splits long knowledge content and keeps the highest-scoring window for the query.
 * Avoids stuffing entire multi-page KB entries into the prompt.
 */
export function selectBestKnowledgeChunk(
  content: string,
  query: string,
  maxChars: number = KNOWLEDGE_CHUNK_MAX_CHARS,
): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const paragraphs = splitIntoParagraphs(trimmed);
  const queryTokens = tokenizeKnowledgeQuery(query);

  if (paragraphs.length <= 1) {
    return trimmed.slice(0, maxChars).trim();
  }

  const ranked = paragraphs
    .map((paragraph, index) => ({
      paragraph,
      index,
      score: scoreParagraph(paragraph, queryTokens),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.index - b.index;
    });

  const selectedIndexes = new Set<number>();
  let used = 0;

  for (const item of ranked) {
    if (item.score === 0 && selectedIndexes.size > 0) {
      break;
    }

    const nextLen = item.paragraph.length + (used > 0 ? 2 : 0);

    if (used > 0 && used + nextLen > maxChars) {
      continue;
    }

    selectedIndexes.add(item.index);
    used += nextLen;

    if (used >= maxChars * 0.85) {
      break;
    }
  }

  if (selectedIndexes.size === 0) {
    return trimmed.slice(0, maxChars).trim();
  }

  const chunk = [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => paragraphs[index])
    .join("\n\n");

  if (chunk.length <= maxChars) {
    return chunk;
  }

  return chunk.slice(0, maxChars).trim();
}

export function buildKnowledgeCitation(id: string): string {
  const compact = id.replace(/-/g, "").slice(0, 8);
  return `KB-${compact}`;
}
