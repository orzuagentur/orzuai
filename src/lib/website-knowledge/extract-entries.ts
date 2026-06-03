import "server-only";

import { getGeminiModel } from "@/lib/gemini";
import { GEMINI_SAFETY_SETTINGS } from "@/lib/gemini/prompts";
import { getGeminiDefaultModel, hasGeminiEnv } from "@/lib/env";
import type { KnowledgeCategory } from "@/types/database.types";
import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";
import type { CrawledPage } from "@/lib/website-knowledge/crawler";
import { truncateText } from "@/lib/website-knowledge/html-text";

export type ExtractedKnowledgeEntry = {
  title: string;
  content: string;
  category: KnowledgeCategory;
  sourceUrl: string;
};

const MAX_ENTRIES_PER_PAGE = 6;
const MAX_TOTAL_ENTRIES = 80;

function parseCategory(value: string): KnowledgeCategory {
  const normalized = value.trim();

  if (KNOWLEDGE_CATEGORIES.includes(normalized as KnowledgeCategory)) {
    return normalized as KnowledgeCategory;
  }

  if (/price|pricing|cost/i.test(normalized)) {
    return "Pricing";
  }

  if (/faq|question/i.test(normalized)) {
    return "FAQ";
  }

  if (/hour|schedule|open/i.test(normalized)) {
    return "Business Hours";
  }

  return "Services";
}

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
    }>;
  };

  if (!Array.isArray(parsed.entries)) {
    return [];
  }

  return parsed.entries
    .filter((entry) => entry.title?.trim() && entry.content?.trim())
    .slice(0, MAX_ENTRIES_PER_PAGE)
    .map((entry) => ({
      title: entry.title!.trim().slice(0, 200),
      content: entry.content!.trim().slice(0, 5000),
      category: parseCategory(entry.category ?? "Services"),
      sourceUrl: "",
    }));
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
      "You extract structured business knowledge from a website page for an AI customer-support assistant.",
      `Website: ${siteUrl}`,
      `Page URL: ${page.url}`,
      `Page title: ${page.title}`,
      "",
      "Return ONLY valid JSON (no markdown) in this shape:",
      '{"entries":[{"title":"short title","content":"factual details for AI","category":"Services|Pricing|FAQ|Business Hours"}]}',
      "Rules:",
      `- Up to ${MAX_ENTRIES_PER_PAGE} entries per page.`,
      "- Include company info, services, products, prices (if present), FAQ, articles, contacts.",
      "- Use only facts from the page text; do not invent data.",
      "- category must be one of: Services, Pricing, FAQ, Business Hours.",
      "",
      "Page text:",
      truncateText(page.text, 9000),
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
    const key = `${entry.sourceUrl}|${entry.title.toLowerCase()}`;

    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  }

  return [...deduped.values()].slice(0, MAX_TOTAL_ENTRIES);
}
