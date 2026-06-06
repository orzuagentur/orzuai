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
} as const;
