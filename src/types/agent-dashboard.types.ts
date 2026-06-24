export type AgentRecentDialogue = {
  id: string;
  contactName: string;
  messagePreview: string;
  channel: string;
  updatedAt: string;
  status: "resolved" | "waiting";
};

export type AgentDashboardStats = {
  aiTextReplies: number;
  voiceAiReplies: number;
  voiceAiReplyMinutes: number;
  totalCallMinutes: number;
  contactsServed: number;
};

export type AgentActivityChannelStat = {
  channel: string;
  count: number;
};

export type AgentActivityPoint = {
  label: string;
  timeLabel: string;
  value: number;
  key: string;
  channels: AgentActivityChannelStat[];
};

export type AgentActivityRangeDays = 1 | 7 | 14 | 30;

export type AiAgentTab =
  | "dashboard"
  | "channels"
  | "knowledge"
  | "voice"
  | "settings";
