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
  canReply: z.boolean().default(true),
  canCreateTask: z.boolean().default(true),
  canCreateDeal: z.boolean().default(true),
  canUpdateContact: z.boolean().default(true),
  canAddNote: z.boolean().default(true),
  canAddInternalNote: z.boolean().default(true),
  canCreateCalendarEvent: z.boolean().default(false),
  canRequestHuman: z.boolean().default(true),
  canNotifyOwner: z.boolean().default(true),
  canNotifyOnActions: z.boolean().default(true),
  canSummarizeActionsInChat: z.boolean().default(true),
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
  canReply: boolean;
  canCreateTask: boolean;
  canCreateDeal: boolean;
  canUpdateContact: boolean;
  canAddNote: boolean;
  canAddInternalNote: boolean;
  canCreateCalendarEvent: boolean;
  canRequestHuman: boolean;
  canNotifyOwner: boolean;
  canNotifyOnActions: boolean;
  canSummarizeActionsInChat: boolean;
};
