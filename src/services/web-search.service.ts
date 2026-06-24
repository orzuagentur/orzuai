import "server-only";

type WebSearchSnippet = {
  title: string;
  snippet: string;
  url?: string;
};

function collectDuckDuckGoTopics(
  topics: unknown,
  output: WebSearchSnippet[],
  depth = 0,
): void {
  if (!Array.isArray(topics) || depth > 2 || output.length >= 8) {
    return;
  }

  for (const topic of topics) {
    if (!topic || typeof topic !== "object") {
      continue;
    }

    const record = topic as Record<string, unknown>;

    if (typeof record.Text === "string" && record.Text.trim()) {
      const [title, ...rest] = record.Text.split(" - ");
      output.push({
        title: title?.trim() || "Result",
        snippet: rest.join(" - ").trim() || record.Text.trim(),
        url: typeof record.FirstURL === "string" ? record.FirstURL : undefined,
      });
    }

    if (Array.isArray(record.Topics)) {
      collectDuckDuckGoTopics(record.Topics, output, depth + 1);
    }
  }
}

export async function searchWebSnippets(
  query: string,
  limit = 6,
): Promise<WebSearchSnippet[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_redirect=1&no_html=1`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Record<string, unknown>;
    const snippets: WebSearchSnippet[] = [];

    if (typeof data.AbstractText === "string" && data.AbstractText.trim()) {
      snippets.push({
        title: typeof data.Heading === "string" ? data.Heading : "Summary",
        snippet: data.AbstractText.trim(),
        url: typeof data.AbstractURL === "string" ? data.AbstractURL : undefined,
      });
    }

    collectDuckDuckGoTopics(data.RelatedTopics, snippets);

    return snippets.slice(0, limit);
  } catch {
    return [];
  }
}

export function formatWebSnippetsForPrompt(snippets: WebSearchSnippet[]): string {
  if (snippets.length === 0) {
    return "No web results found.";
  }

  return snippets
    .map(
      (snippet, index) =>
        `${index + 1}. ${snippet.title}\n${snippet.snippet}${snippet.url ? `\n${snippet.url}` : ""}`,
    )
    .join("\n\n");
}
