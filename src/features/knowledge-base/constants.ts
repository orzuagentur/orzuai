export const KNOWLEDGE_MESSAGES = {
  pageTitle: "Knowledge",
  pageDescription:
    "Manage manual entries and sync content from your website for AI replies.",
  websiteSyncTitle: "Website sync",
  websiteSyncDescription:
    "Scan your public website and automatically add pages to your AI knowledge.",
  manualEntriesTitle: "Manual entries",
  createTitle: "Add knowledge entry",
  editTitle: "Edit knowledge entry",
  createDescription:
    "Add information your AI assistant can use when replying to customers.",
  createSuccess: "Knowledge entry created successfully.",
  updateSuccess: "Knowledge entry updated successfully.",
  deleteSuccess: "Knowledge entry deleted successfully.",
  deleteTitle: "Delete knowledge entry?",
  deleteDescription:
    "This entry will be removed from your AI assistant context. This action cannot be undone.",
  emptyTitle: "No knowledge entries yet",
  emptyDescription:
    "Add your services, pricing, FAQs, or business hours to help the AI respond accurately.",
  emptySearchTitle: "No matching entries",
  emptySearchDescription: "Try a different search term or category filter.",
  noBusinessTitle: "Create your business profile first",
  noBusinessDescription:
    "Set up your business profile before adding knowledge base content.",
  genericError: "Unable to save knowledge entry. Please try again.",
  deleteError: "Unable to delete knowledge entry. Please try again.",
  notFound: "Knowledge entry not found.",
  missingConfig:
    "Knowledge base services are not configured. Missing required environment variables.",
} as const;
