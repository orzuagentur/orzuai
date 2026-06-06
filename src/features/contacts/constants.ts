import {
  INTEGRATION_CHANNEL_LIST,
  MESSAGING_INTEGRATION_CHANNELS,
} from "@/features/integrations/constants";

const channelLabelById = new Map(
  INTEGRATION_CHANNEL_LIST.map((channel) => [channel.id, channel.label]),
);

export const CONTACTS_MESSAGES = {
  pageTitle: "CRM",
  pageDescription:
    "All contacts across WhatsApp, Instagram, Telegram, and Website Forms.",
  emptyTitle: "No contacts yet",
  emptyDescription:
    "Connect a channel in Integrations. Contacts appear when customers message you.",
  emptyCta: "Open Integrations",
  filterAll: "All channels",
  profileTitle: "Contact profile",
  timelineTitle: "Recent activity",
  timelineEmpty: "No messages yet.",
  openInbox: "Open in Inbox",
  lastMessage: "Last message",
  contactsCount: (count: number) =>
    count === 1 ? "1 contact" : `${count} contacts`,
  emailLabel: "Email",
  tagsLabel: "Tags",
  tagsHint: "Comma-separated, e.g. hot-lead, vip",
  companyLabel: "Company",
  notesLabel: "Notes",
  editContact: "Edit contact",
  saveContact: "Save changes",
  cancelEdit: "Cancel",
  deleteContact: "Delete contact",
  deleteConfirmTitle: "Delete this contact?",
  deleteConfirmDescription:
    "The contact and linked conversations will be permanently removed.",
  contactSaved: "Contact updated.",
  contactDeleted: "Contact deleted.",
  contactSaveFailed: "Unable to save contact. Please try again.",
  contactDeleteFailed: "Unable to delete contact. Please try again.",
  leadScoreLabel: "Lead score",
  aiSummaryLabel: "AI summary",
  generateInsights: "Generate AI insights",
  generatingInsights: "Analyzing…",
  insightsGenerated: "AI insights updated.",
  insightsFailed: "Unable to generate AI insights. Please try again.",
  insightsUnavailable: "AI insights require Gemini API configuration.",
  internalNoteActivity: "Internal note",
  hotLead: "Hot lead",
  warmLead: "Warm lead",
  coldLead: "Cold lead",
  segmentAll: "All contacts",
  segmentHotLeads: "Hot leads",
  segmentNoReply48h: "No reply 48h+",
  viewList: "List",
  viewPipeline: "Pipeline",
  pipelineNew: "New",
  pipelineQualified: "Qualified",
  pipelineProposal: "Proposal",
  pipelineWon: "Won",
  pipelineLost: "Lost",
  pipelineUpdated: "Pipeline stage updated.",
  dealValueLabel: "Deal value",
  expectedCloseLabel: "Expected close",
  tasksTitle: "Tasks",
  taskTitleLabel: "Task title",
  taskDueLabel: "Due date",
  addTask: "Add task",
  taskSaved: "Task created.",
  taskSaveFailed: "Unable to save task.",
  taskDeleteFailed: "Unable to delete task.",
  taskDone: "Done",
  taskOpen: "Open",
  sentimentLabel: "Sentiment",
} as const;

export const CONTACT_SEGMENT_FILTERS = [
  { id: "all" as const, label: CONTACTS_MESSAGES.segmentAll },
  { id: "hot_leads" as const, label: CONTACTS_MESSAGES.segmentHotLeads },
  { id: "no_reply_48h" as const, label: CONTACTS_MESSAGES.segmentNoReply48h },
] as const;

export const CONTACT_CHANNEL_FILTERS = [
  { id: null, label: CONTACTS_MESSAGES.filterAll },
  ...MESSAGING_INTEGRATION_CHANNELS.map((channelId) => ({
    id: channelId,
    label: channelLabelById.get(channelId) ?? channelId,
  })),
] as const;
