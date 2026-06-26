export type AiAgentAnalytics = {
  agentId: string;
  contactsServed: number;
  conversationsHandled: number;
  totalAiReplies: number;
  aiRepliesLast7Days: number;
  aiRepliesLast30Days: number;
  clientMessagesInHandledConversations: number;
  humanRepliesAfterAgent: number;
  avgRepliesPerContact: number;
  avgRepliesPerConversation: number;
  lastReplyAt: string | null;
  firstReplyAt: string | null;
  trackingSince: string | null;
  channelBreakdown: Array<{
    channel: string;
    contactsServed: number;
    aiReplies: number;
    conversationsHandled: number;
  }>;
  dailyReplies: Array<{
    date: string;
    count: number;
  }>;
};

export type AiAgentActionResult =
  | { success: true; id?: string }
  | { success: false; error: { code: string; message: string } };
