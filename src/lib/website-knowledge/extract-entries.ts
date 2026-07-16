import "server-only";

import { getGeminiModel } from "@/lib/gemini";
import { GEMINI_SAFETY_SETTINGS } from "@/lib/gemini/prompts";
import { getGeminiDefaultModel, hasGeminiEnv } from "@/lib/env";
import { resolveKnowledgeCategory } from "@/features/knowledge-base/categories";
import type { CrawledPage } from "@/lib/website-knowledge/crawler";
import { truncateText } from "@/lib/website-knowledge/html-text";
import type { KnowledgeEntryMetadata } from "@/types/knowledge-category.types";

export type ExtractedKnowledgeEntry = {
  title: string;
  content: string;
  category: string;
  sourceUrl: string;
  metadata: KnowledgeEntryMetadata;
};

const MAX_ENTRIES_PER_PAGE = 10;
const MAX_TOTAL_ENTRIES = 120;

function parseGeminiJsonPayload(raw: string): ExtractedKnowledgeEntry[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as {
    entries?: Array<{
      title?: string;
      content?: string;
      category?: string;
      price?: string;
    }>;
  };

  if (!Array.isArray(parsed.entries)) {
    return [];
  }

  return parsed.entries
    .filter((entry) => entry.title?.trim() && entry.content?.trim())
    .slice(0, MAX_ENTRIES_PER_PAGE)
    .map((entry) => {
      const category = resolveKnowledgeCategory(entry.category ?? "Services");
      const price = entry.price?.trim();
      return {
        title: entry.title!.trim().slice(0, 200),
        content: entry.content!.trim().slice(0, 5000),
        category,
        sourceUrl: "",
        metadata: price ? { price: price.slice(0, 80) } : {},
      };
    });
}

export async function extractKnowledgeEntriesFromPages(
  pages: CrawledPage[],
  siteUrl: string,
): Promise<ExtractedKnowledgeEntry[]> {
  if (!hasGeminiEnv() || pages.length === 0) {
    return [];
  }

  const model = getGeminiModel({ model: getGeminiDefaultModel() });
  const allEntries: ExtractedKnowledgeEntry[] = [];

  for (const page of pages) {
    if (allEntries.length >= MAX_TOTAL_ENTRIES) {
      break;
    }

    const prompt = [
      "You extract professional business knowledge from one website page for an AI customer-support agent.",
      `Website: ${siteUrl}`,
      `Page URL: ${page.url}`,
      `Page title: ${page.title}`,
      "",
      "Return ONLY valid JSON (no markdown) in this shape:",
      '{"entries":[{"title":"short title","content":"clear factual details","category":"Services|Pricing|FAQ|Business Hours|Address|Contact|Policies|Additional|or a specific custom category name","price":"optional price string"}]}',
      "Rules:",
      `- Up to ${MAX_ENTRIES_PER_PAGE} high-quality entries from THIS page only.`,
      "- Prefer spreadsheet-ready rows: one service/product/FAQ/fact per entry.",
      "- For services/products include price in `price` when the page shows it.",
      "- If the page has a clear topic not covered by standard categories (e.g. Team, Warranty, Shipping), invent a concise custom category name.",
      "- Use only facts from the page; do not invent prices or claims.",
      "- Write polished, customer-ready content (complete sentences, no HTML).",
      "",
      "Page text:",
      truncateText(page.text, 10_000),
    ].join("\n");

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings: [...GEMINI_SAFETY_SETTINGS],
      });

      const text = result.response.text()?.trim();

      if (!text) {
        continue;
      }

      const entries = parseGeminiJsonPayload(text).map((entry) => ({
        ...entry,
        sourceUrl: `${page.url}#${entry.title.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}`,
      }));

      allEntries.push(...entries);
    } catch {
      continue;
    }
  }

  const deduped = new Map<string, ExtractedKnowledgeEntry>();

  for (const entry of allEntries) {
    const key = `${entry.category.toLowerCase()}|${entry.title.toLowerCase()}`;

    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  }

  return [...deduped.values()].slice(0, MAX_TOTAL_ENTRIES);
}
