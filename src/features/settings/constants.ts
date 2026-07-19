export const ACCOUNT_SETTINGS_MESSAGES = {
  pageTitle: "Account",
  pageDescription: "Manage your personal account, plan, and sign-in details.",
  profileTitle: "Your account",
  profileDescription: "Personal information linked to your OrzuX login.",
  emailLabel: "Email",
  nameLabel: "Full name",
  planLabel: "Current plan",
  openBilling: "Manage billing",
  deleteAccount: "Delete account",
  profileNav: "Profile",
  accountNav: "Account",
} as const;

export const BUSINESS_PROFILE_MESSAGES = {
  pageTitle: "Profile",
  pageDescription:
    "Manage your business logo, contact details, and public-facing information.",
} as const;

export const SETTINGS_MESSAGES = {
  pageTitle: "Settings",
  pageDescription:
    "Push alerts, quick replies, language, and other workspace preferences.",
  tabPush: "Push notifications",
  tabQuickReplies: "Quick replies",
  tabLanguage: "Language",
  tabProfile: "Business profile",
  tabAccount: "Account",
  openDocumentation: "Documentation",
  openDocumentationHint: "Guides for inbox, AI, CRM, calls, and setup",
  languageTitle: "Interface language",
  languageDescription:
    "Choose the language used across your dashboard. Saved on this device.",
  languageSaved: "Language preference saved.",
} as const;

export type DashboardLocale = "en" | "ru" | "uz";

export const DASHBOARD_LOCALE_LABELS: Record<DashboardLocale, string> = {
  en: "English",
  ru: "Русский",
  uz: "Oʻzbekcha",
};

export const DASHBOARD_LOCALE_STORAGE_KEY = "orzu-dashboard-locale";

