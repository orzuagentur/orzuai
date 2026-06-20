export type RankableKnowledgeEntry = {
  title: string;
  content: string;
  category: string | null;
  updatedAt?: string;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "i",
  "you",
  "we",
  "they",
  "it",
  "this",
  "that",
  "with",
  "at",
  "from",
  "как",
  "что",
  "это",
  "для",
  "при",
  "или",
  "если",
  "меня",
  "вас",
  "нас",
  "вам",
  "мне",
  "на",
  "по",
  "из",
  "за",
  "не",
  "да",
  "нет",
  "ваш",
  "наш",
  "мой",
  "ваш",
]);

export function tokenizeKnowledgeQuery(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
    ),
  ];
}

export function scoreKnowledgeEntry(
  entry: RankableKnowledgeEntry,
  queryTokens: string[],
): number {
  if (queryTokens.length === 0) {
    return 0;
  }

  const title = entry.title.toLowerCase();
  const content = entry.content.toLowerCase();
  const category = (entry.category ?? "").toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 4;
    }

    if (category.includes(token)) {
      score += 2;
    }

    if (content.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export function rankKnowledgeEntries<T extends RankableKnowledgeEntry>(
  entries: T[],
  query: string,
  limit: number,
): T[] {
  const queryTokens = tokenizeKnowledgeQuery(query);

  if (queryTokens.length === 0) {
    return [...entries]
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, limit);
  }

  return [...entries]
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(entry, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (b.entry.updatedAt ?? "").localeCompare(a.entry.updatedAt ?? "");
    })
    .slice(0, limit)
    .map((item) => item.entry);
}
