import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini/constants";
import { getGeminiApiKey, getGeminiDefaultModel } from "@/lib/env";

let platformGeminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(apiKey?: string): GoogleGenerativeAI {
  const resolvedKey = apiKey?.trim() || getGeminiApiKey();

  if (!apiKey) {
    if (!platformGeminiClient) {
      platformGeminiClient = new GoogleGenerativeAI(resolvedKey);
    }

    return platformGeminiClient;
  }

  return new GoogleGenerativeAI(resolvedKey);
}

type GetGeminiModelParams = {
  model?: string;
  systemInstruction?: string;
  apiKey?: string;
};

export function getGeminiModel({
  model,
  systemInstruction,
  apiKey,
}: GetGeminiModelParams = {}): GenerativeModel {
  return getGeminiClient(apiKey).getGenerativeModel({
    model: model ?? getGeminiDefaultModel() ?? DEFAULT_GEMINI_MODEL,
    systemInstruction,
  });
}
