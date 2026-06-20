import { z } from "zod";

import { isCommunicationStyleId } from "@/features/ai-assistant/communication-styles";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

const languageValues = AI_LANGUAGE_OPTIONS.map((option) => option.value) as [
  string,
  ...string[],
];

export const saveAiAssistantProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000),
  communicationStyle: z.string().refine(isCommunicationStyleId, {
    message: "Select a communication style.",
  }),
  language: z.enum(languageValues),
});

export type SaveAiAssistantProfileInput = z.infer<
  typeof saveAiAssistantProfileSchema
>;

export type AiAssistantProfileData = {
  businessId: string;
  name: string;
  systemPrompt: string;
  communicationStyle: string;
  language: string;
};
