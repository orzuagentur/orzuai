import type { CrmOrderSource } from "@/types/crm-order.types";

export const ORDERS_MESSAGES = {
  pageTitle: "Orders",
  pageSubtitle:
    "Requests and orders from channels, website forms, and managers — never calendar bookings.",
  emptyTitle: "No orders yet",
  emptyDescription:
    "Website form submissions, AI channel requests, and manually added orders appear here.",
  filterAll: "All",
  statusNew: "New",
  statusInProgress: "In progress",
  statusDone: "Done",
  statusCancelled: "Cancelled",
  sourceWebsiteForms: "Website form",
  sourceWebsiteChat: "Website chat",
  sourceWhatsapp: "WhatsApp",
  sourceTelegram: "Telegram",
  sourceInstagram: "Instagram",
  sourceEmail: "Email",
  sourceVoice: "Calls",
  sourceSms: "SMS",
  sourceMessenger: "Messenger",
  sourceAi: "AI",
  sourceManual: "Manual",
  sourceLabel: "Source",
  updateFailed: "Unable to update order.",
  updateSuccess: "Order updated.",
  createSuccess: "Order created.",
  createFailed: "Unable to create order.",
  openChat: "Open chat",
  openContact: "Open contact",
  noContact: "No contact",
  searchPlaceholder: "Search orders…",
  filtersLabel: "Filters",
  formSettingsLabel: "Order form settings",
  formSettingsTitle: "Configure order form",
  formSettingsDescription:
    "Choose which fields appear when creating an order. Add ready-made options for services, prices, and custom fields. Mark fields as required for managers and AI.",
  formSettingsSave: "Save settings",
  formSettingsSaved: "Order form settings saved.",
  formSettingsFailed: "Unable to save order form settings.",
  formAddBuiltin: "Add ready-made field",
  formAddCustom: "Add custom field",
  formEnabled: "Show",
  formRequired: "Required",
  formCustomLabel: "Custom field label",
  formOptionsLabel: "Ready-made options",
  formOptionsHint: "Managers and AI can pick from these variants.",
  formOptionPlaceholder: "Add an option…",
  formAddOption: "Add",
  formImportFromKbServices: "Import services from Knowledge",
  formImportFromKbPrices: "Import prices from Knowledge",
  formImportEmpty: "Nothing found in Knowledge Base.",
  formAtLeastOne: "Fill at least one field to create an order.",
  formSelectOption: "Select…",
  formOrTypeCustom: "Or type a custom value",
  addOrder: "Add order",
  createTitle: "Add order",
  createDescription:
    "Create a customer request or order. Fill any field — only configured required fields are mandatory.",
  customerNameLabel: "Customer name",
  phoneLabel: "Phone",
  emailLabel: "Email",
  orderTitleLabel: "What they want",
  serviceTypeLabel: "Service type",
  serviceTypePlaceholder: "e.g. Delivery, Repair, Quote",
  descriptionLabel: "Details",
  amountLabel: "Amount (optional)",
  contactSearchLabel: "Link CRM contact (optional)",
  contactSearchPlaceholder: "Search contacts…",
  saveOrder: "Save order",
  cancel: "Cancel",
  colCustomer: "Customer",
  colOrder: "Order",
  colService: "Service",
  colStatus: "Status",
  colDate: "Date & time",
  colSource: "Source",
  detailTitle: "Order details",
  detailCustomer: "Customer",
  detailContacts: "Contacts",
  detailWanted: "What they want",
  detailService: "Service type",
  detailDescription: "Details",
  detailCreated: "Created",
  detailUpdated: "Updated",
  detailAmount: "Amount",
  detailSource: "Source",
  detailStatus: "Status",
  closeDetail: "Close",
  notSpecified: "—",
} as const;

export function formatOrderFormImportSuccess(count: number): string {
  return `Imported ${count} option${count === 1 ? "" : "s"} from Knowledge.`;
}

export function getOrderStatusLabel(
  status: "new" | "in_progress" | "done" | "cancelled",
): string {
  switch (status) {
    case "new":
      return ORDERS_MESSAGES.statusNew;
    case "in_progress":
      return ORDERS_MESSAGES.statusInProgress;
    case "done":
      return ORDERS_MESSAGES.statusDone;
    case "cancelled":
      return ORDERS_MESSAGES.statusCancelled;
  }
}

export function getOrderSourceLabel(source: CrmOrderSource): string {
  switch (source) {
    case "website_forms":
      return ORDERS_MESSAGES.sourceWebsiteForms;
    case "website_chat":
      return ORDERS_MESSAGES.sourceWebsiteChat;
    case "whatsapp":
      return ORDERS_MESSAGES.sourceWhatsapp;
    case "telegram":
      return ORDERS_MESSAGES.sourceTelegram;
    case "instagram":
      return ORDERS_MESSAGES.sourceInstagram;
    case "email":
      return ORDERS_MESSAGES.sourceEmail;
    case "voice":
      return ORDERS_MESSAGES.sourceVoice;
    case "sms":
      return ORDERS_MESSAGES.sourceSms;
    case "facebook_messenger":
      return ORDERS_MESSAGES.sourceMessenger;
    case "ai":
      return ORDERS_MESSAGES.sourceAi;
    case "manual":
      return ORDERS_MESSAGES.sourceManual;
  }
}

export function readOrderPayloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

/** Fixed locale so SSR and client render the same string (avoids hydration mismatch). */
export function formatOrderDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
