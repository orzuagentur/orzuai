import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini/constants";
import { getGeminiApiKey, getGeminiDefaultModel } from "@/lib/env";

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getGeminiApiKey());
  }

  return geminiClient;
}

type GetGeminiModelParams = {
  model?: string;
  systemInstruction?: string;
};

export function getGeminiModel({
  model,
  systemInstruction,
}: GetGeminiModelParams = {}): GenerativeModel {
  return getGeminiClient().getGenerativeModel({
    model: model ?? getGeminiDefaultModel() ?? DEFAULT_GEMINI_MODEL,
    systemInstruction,
  });
}
