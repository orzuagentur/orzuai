import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations";

export const CHANNEL_WORKSPACE_MESSAGES = {
  contactsEmpty: "No contacts for this channel yet.",
  contactsEmptyHint:
    "Contacts appear when customers message you on this channel. WhatsApp contacts sync from incoming messages.",
  contactsCount: (count: number) =>
    count === 1 ? "1 contact" : `${count} contacts`,
  aiTitle: "AI Assistant",
  aiDescription: "Control automated replies for this channel.",
  aiEnabledLabel: "AI auto-replies",
  aiEnabledOn: "AI auto-replies are enabled for this channel.",
  aiEnabledOff: "AI auto-replies are disabled for this channel.",
  aiSave: "Save settings",
  aiSaved: "AI Assistant settings saved.",
  aiSystemPromptLabel: "Business instructions",
  aiSystemPromptHint:
    "Tell the assistant how to represent your business. Used for incoming messages on this channel.",
  aiModelLabel: "Gemini model",
  aiModelLegacyHint:
    "Consider switching to Gemini 2.5 Flash for better speed and quality.",
  aiLanguageLabel: "Reply language",
  aiTestTitle: "Test reply",
  aiTestDescription:
    "Simulate a customer message and preview how the assistant would respond.",
  aiTestPlaceholder: "e.g. What are your opening hours?",
  aiTestButton: "Generate test reply",
  aiTestEmpty: "Enter a sample message to test the assistant.",
  aiGeminiMissing:
    "Gemini is not configured. Add GEMINI_API_KEY to enable AI replies.",
  aiKnowledgeHint: "Add FAQs and policies in Knowledge Base to improve answers.",
  analyticsTitle: "Analytics",
  analyticsDescription: "Performance metrics for this channel.",
  notConnectedHint:
    "Connect this channel in Integrations → Activate to start collecting data.",
  openChats: "Open Chats",
  totalMessages: "Total Messages",
  uniqueContacts: "Contacts",
  aiReplies: "AI Replies",
  conversionRate: "AI share",
  activeConversations: "Active chats",
  manualReplies: "Manual / other",
  activityTitle: "Messages — last 7 days",
  recentTitle: "Recent messages",
  recentEmpty: "No messages on this channel yet.",
  openChatsHint: "Reply manually or review AI messages in Chats.",
} as const;

export function getChannelLabel(channel: string): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((c) => c.id === channel)?.label ?? channel
  );
}
