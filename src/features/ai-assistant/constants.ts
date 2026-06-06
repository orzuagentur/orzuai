export const AI_ASSISTANT_MESSAGES = {
  pageTitle: "AI Assistant",
  pageDescription:
    "Configure automated replies per channel. Choose a model, language, and instructions for WhatsApp, Instagram, and Telegram.",
  channelsTitle: "Channels",
  globalTitle: "Defaults for all channels",
  globalDescription:
    "Apply the same model, language, and instructions to WhatsApp, Instagram, and Telegram at once. You can still customize each channel afterward.",
  globalApply: "Apply to all channels",
  globalApplied: "Defaults applied to all channels.",
  channelNotConnected:
    "This channel is not connected yet. AI settings are saved, but auto-replies start after you connect the channel in Integrations.",
  goToIntegrations: "Connect channel",
  agentBuilderTitle: "Custom AI agents",
  agentBuilderDescription:
    "Build agents with prompts, channel targets, and keyword triggers. Use templates to get started fast.",
  agentName: "Agent name",
  agentPrompt: "System prompt",
  agentChannels: "Active channels",
  agentTriggers: "Trigger keywords (comma-separated)",
  agentCreate: "Create agent",
  agentSaved: "AI agent saved.",
  agentDeleted: "AI agent deleted.",
  saveFailed: "Unable to save agent. Please try again.",
  deleteFailed: "Unable to delete agent. Please try again.",
  usageTitle: "AI usage limits",
  usageDescription:
    "Monthly AI reply quota for your subscription plan. Resets on the first day of each month.",
  salesAgentTitle: "AI Sales Agent (BANT)",
  salesAgentDescription:
    "Score Budget, Authority, Need, and Timeline on incoming messages. High scores can auto-move leads to Qualified.",
  salesAgentEnabled: "Enable BANT qualification on new customer messages",
  bantThresholdLabel: "Qualification threshold (0–100)",
  autoQualifyLabel: "Auto-move to Qualified pipeline when score exceeds threshold",
  salesAgentSave: "Save sales agent rules",
  salesAgentSaved: "Sales agent rules saved.",
  autoTaskEnabled: "Auto-create CRM task on high-intent messages",
  autoTaskThresholdLabel: "Intent threshold (0–100)",
  sentimentEnabled: "Analyze sentiment on incoming messages",
} as const;
