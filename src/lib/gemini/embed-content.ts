import "server-only";

import { getGeminiApiKey, hasGeminiEnv } from "@/lib/env";

const GEMINI_EMBED_API = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiEmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

type GeminiEmbedContentResponse = {
  embedding?: {
    values?: number[];
  };
};

export function normalizeEmbeddingVector(values: number[]): number[] {
  let sumSquares = 0;

  for (const value of values) {
    sumSquares += value * value;
  }

  const norm = Math.sqrt(sumSquares);

  if (norm === 0) {
    return values;
  }

  return values.map((value) => value / norm);
}

export async function requestGeminiEmbedding(input: {
  model: string;
  text: string;
  outputDimensionality?: number;
  taskType?: GeminiEmbedTaskType;
  title?: string;
}): Promise<number[] | null> {
  if (!hasGeminiEnv()) {
    return null;
  }

  const trimmed = input.text.trim();

  if (!trimmed) {
    return null;
  }

  const apiKey = getGeminiApiKey();
  const url = `${GEMINI_EMBED_API}/models/${input.model}:embedContent?key=${encodeURIComponent(apiKey)}`;

  const embedContentConfig: Record<string, string | number> = {};

  if (input.taskType) {
    embedContentConfig.taskType = input.taskType;
  }

  if (input.title?.trim()) {
    embedContentConfig.title = input.title.trim();
  }

  if (input.outputDimensionality) {
    embedContentConfig.outputDimensionality = input.outputDimensionality;
  }

  const body: Record<string, unknown> = {
    model: `models/${input.model}`,
    content: {
      parts: [{ text: trimmed }],
    },
  };

  if (Object.keys(embedContentConfig).length > 0) {
    body.embedContentConfig = embedContentConfig;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorBody}`);
  }

  const payload = (await response.json()) as GeminiEmbedContentResponse;
  const values = payload.embedding?.values;

  if (!values?.length) {
    return null;
  }

  return values;
}
