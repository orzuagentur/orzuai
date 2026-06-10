export const AI_KEYS_SETTINGS_MESSAGES = {
  sectionTitle: "AI API keys",
  sectionDescription:
    "Store your provider keys securely. Use them across agents or track costs in Analytics.",
  preferAllAgentsLabel: "Use own API keys for all new agents",
  preferAllAgentsHint:
    "When enabled, new agents default to your saved keys instead of OrzuAI platform AI.",
  preferAllAgentsSaved: "Default updated.",
  preferAllAgentsFailed: "Unable to update preference.",
  emptyTitle: "No API keys saved",
  emptyDescription:
    "Add a key when creating an agent, or save one here for reuse across agents.",
  savedAt: (date: string) => `Updated ${date}`,
  showKey: "Show",
  hideKey: "Hide",
  copyKey: "Copy",
  copiedKey: "API key copied.",
  copyFailed: "Unable to copy API key.",
  revealFailed: "Unable to load API key.",
  deleteKey: "Delete key",
  deleteStep1Title: "Delete this API key?",
  deleteStep1Description:
    "Agents using this provider will stop using your key. They may fall back to OrzuAI platform AI if available.",
  deleteStep2Title: "This cannot be undone",
  deleteStep2Description:
    "Deleting removes the key from your account. You will need to enter it again to restore customer billing for this provider.",
  deleteStep3Title: "Confirm deletion",
  deleteStep3Description: (code: string) =>
    `Type the confirmation code below to permanently delete this key: ${code}`,
  deleteCodeLabel: "Confirmation code",
  deleteCodeMismatch: "Confirmation code does not match.",
  deleteContinue: "Continue",
  deleteCancel: "Cancel",
  deleteConfirm: "Delete permanently",
  deleteSuccess: "API key deleted.",
  deleteFailed: "Unable to delete API key.",
  keyHiddenLabel: "API key",
  providerBadge: "Provider",
} as const;
