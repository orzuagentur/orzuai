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
  aiEnabledOn: "AI is enabled for this channel.",
  aiEnabledOff: "AI is disabled for this channel.",
  aiSave: "Save",
  analyticsTitle: "Analytics",
  analyticsDescription: "Performance metrics for this channel.",
  notConnectedHint:
    "Connect this channel in Integrations → Activate to start collecting data.",
  openChats: "Open Chats",
  totalMessages: "Total Messages",
  uniqueContacts: "Contacts",
  aiReplies: "AI Replies",
  conversionRate: "Conversion Rate",
} as const;

export function getChannelLabel(channel: string): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((c) => c.id === channel)?.label ?? channel
  );
}
