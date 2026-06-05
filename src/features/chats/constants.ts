export const CHAT_MESSAGES = {
  pageTitle: "Inbox",
  pageDescription:
    "All channels in one place — open WhatsApp, Instagram, Telegram, or Website Forms inboxes.",
  monitorTitle: "Overview",
  monitorDescription:
    "Summary of conversations and activity across every connected channel.",
  channelsTitle: "Channels",
  openChannel: "Open inbox",
  viewMonitor: "All channels",
  channelInbox: "Inbox",
  conversationsCount: "conversations",
  messagesToday: "messages",
  notConnectedHint: "Connect this channel in Integrations to receive messages.",
  websiteFormsReplyHint:
    "Website form leads are saved in OrzuAI. Replies here are stored in the conversation (no external send).",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile before viewing customer conversations.",
  emptyListTitle: "No conversations yet",
  emptyListDescription:
    "Connect a channel in Integrations and receive customer messages to see them here.",
  selectConversation: "Select a conversation to view message history.",
  whatsappNotConnected:
    "WhatsApp is not connected. Connect it in Integrations to send replies.",
  instagramNotConnected:
    "Instagram is not connected. Connect it in Integrations to send replies.",
  telegramNotConnected:
    "Telegram is not connected. Connect it in Integrations to send replies.",
  websiteFormsNotConnected:
    "Enable Website Forms in Integrations to receive leads here.",
  sendSuccess: "Message sent successfully.",
  sendFailed: "Unable to send message. Please try again.",
  aiEnabledSuccess: "AI auto-replies enabled.",
  aiDisabledSuccess: "AI auto-replies disabled.",
  aiToggleFailed: "Unable to update AI status. Please try again.",
  missingConfig: "Chat services are not configured.",
  genericError: "Something went wrong. Please try again.",
  searchPlaceholder: "Search by name, phone, or message…",
  filterAll: "All",
  filterAiHandled: "AI handled",
  filterNeedsHuman: "Needs human",
  filterActive: "Active",
  emptySearchTitle: "No matching conversations",
  emptySearchDescription: "Try a different search term or filter.",
  unifiedInboxTitle: "All channels",
  unifiedInboxDescription:
    "Every conversation across WhatsApp, Instagram, Telegram, and Website Forms.",
  internalNotesTitle: "Internal note",
  internalNotesDescription:
    "Visible only to your team. Customers never see this note.",
  internalNotesPlaceholder: "Add context for your team…",
  internalNotesSave: "Save note",
  internalNoteSaved: "Internal note saved.",
  statusLabel: "Conversation status",
  statusUpdated: "Conversation status updated.",
  suggestReplyTitle: "AI suggest reply",
  suggestReplyDescription:
    "Generate a draft reply based on conversation history and your knowledge base.",
  suggestReplyButton: "Generate suggestion",
  suggestReplyUse: "Use in reply",
  suggestReplyEmpty: "Click generate to get an AI draft for this conversation.",
  suggestReplyFailed: "Unable to generate a suggestion. Please try again.",
  suggestReplyNoMessages:
    "No customer messages yet. Wait for the customer to write first.",
} as const;

export type ChatInboxFilter = "all" | "ai_handled" | "needs_human" | "active";
