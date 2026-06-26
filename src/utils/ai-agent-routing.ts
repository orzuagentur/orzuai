import type { MessagingChannel } from "@/types/database.types";

export type RoutableAiAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  channels: MessagingChannel[];
  triggerKeywords: string[];
  enabled: boolean;
  provider?: string;
  model?: string;
  useCustomModel?: boolean;
  language?: string;
  communicationStyle?: string;
  updatedAt?: string;
};
