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
  stepKnowledgeTitle: "Add knowledge (optional)",
  stepKnowledgeDescription:
    "Optional: add FAQs, pricing, or hours so the AI can answer accurately. You can do this anytime from Knowledge Base.",
  stepKnowledgeAdd: "Add knowledge entry",
  stepAiTitle: "Enable AI Assistant",
  stepAiDescription:
    "Turn on auto-replies for your connected channel. Optional: add knowledge and run a quick test before going live.",
  stepAiEnabled: "AI auto-replies are on. You're ready to go live.",
  stepAiCustomize: "Customize assistant",
  stepAiOpenSettings: "Open AI Assistant",
  stepTestTitle: "Quick test (optional)",
  stepTestDescription: "Preview how the AI would reply to a sample message.",
  stepTestPlaceholder: "e.g. What are your opening hours?",
  stepTestButton: "Generate test reply",
  stepFinish: "Go to dashboard",
  back: "Back",
  continue: "Continue",
  checklistTitle: "Setup progress",
  checklistDescription: "Complete required steps to launch your AI inbox.",
} as const;

export const ONBOARDING_STEPS = [
  { id: "business", label: "Business" },
  { id: "channel", label: "Channel" },
  { id: "ai", label: "AI Assistant" },
] as const;
