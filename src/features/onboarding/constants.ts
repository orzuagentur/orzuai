export const ONBOARDING_MESSAGES = {
  pageTitle: "Set up OrzuX",
  pageDescription:
    "Complete these steps to launch your multi-channel AI assistant.",
  progressLabel: "Setup progress",
  stepBusinessTitle: "Create your business",
  stepBusinessDescription:
    "Add your business name and contact details. This powers AI replies and customer context.",
  stepChannelTitle: "Connect a channel",
  stepChannelDescription:
    "Start with WhatsApp to receive and reply to customer messages.",
  stepKnowledgeTitle: "Add knowledge",
  stepKnowledgeDescription:
    "Optional: add FAQs, pricing, or hours so the AI can answer accurately.",
  stepKnowledgeSkip: "Skip for now",
  stepKnowledgeAdd: "Add first entry",
  stepAiTitle: "Enable AI Assistant",
  stepAiDescription:
    "Turn on auto-replies for your connected channel. Customize name, tone, and language in AI Assistant.",
  stepAiTurnOn: "Turn on AI",
  stepAiTurnOff: "Turn off AI",
  stepAiEnabled: "AI auto-replies are on for this channel.",
  stepAiCustomize: "Customize assistant",
  stepAiOpenSettings: "Open AI Assistant",
  stepTestTitle: "Test your assistant",
  stepTestDescription:
    "Send a sample customer message and preview how the AI Assistant would respond.",
  stepTestPlaceholder: "e.g. What are your opening hours?",
  stepTestButton: "Generate test reply",
  stepFinish: "Go to dashboard",
  back: "Back",
  continue: "Continue",
  checklistTitle: "Finish setup",
  checklistDescription: "Complete these steps to go live with your AI inbox.",
} as const;

export const ONBOARDING_STEPS = [
  { id: "business", label: "Business" },
  { id: "channel", label: "Channel" },
  { id: "knowledge", label: "Knowledge" },
  { id: "ai", label: "AI" },
  { id: "test", label: "Test" },
] as const;
