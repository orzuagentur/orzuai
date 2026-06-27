export const APP_ROUTES = {
  home: "/",
  dashboard: "/dashboard",
} as const;

export const LEGAL_ROUTES = {
  privacy: "/privacy",
  terms: "/terms",
  dataDeletion: "/data-deletion",
} as const;

export const AUTH_ROUTES = {
  callback: "/auth/callback",
  confirm: "/auth/confirm",
  authCodeError: "/auth/auth-code-error",
  login: "/auth/login",
  logout: "/auth/logout",
  register: "/auth/register",
  registerConfirmation: "/auth/register/confirmation",
  verifySuccess: "/auth/verify/success",
  forgotPassword: "/auth/forgot-password",
  forgotPasswordConfirmation: "/auth/forgot-password/confirmation",
  magicLinkConfirmation: "/auth/magic-link/confirmation",
  resetPassword: "/auth/reset-password",
  resetPasswordSuccess: "/auth/reset-password/success",
} as const;

export const DASHBOARD_ROUTES = {
  overview: "/dashboard",
  onboarding: "/dashboard/onboarding",
  chats: "/dashboard/chats",
  chatsMonitor: "/dashboard/chats",
  chatsFavorites: "/dashboard/chats/favorites",
  chatsVoice: "/dashboard/chats/voice",
  contacts: "/dashboard/contacts",
  knowledgeBase: "/dashboard/knowledge-base",
  integrations: "/dashboard/integrations",
  aiAssistant: "/dashboard/ai-assistant",
  aiAssistantSection: "/dashboard/ai-assistant",
  aiAgentsSection: "/dashboard/ai-assistant",
  aiManager: "/dashboard/ai-assistant",
  analytics: "/dashboard/analytics",
  settings: "/dashboard/settings",
  subscription: "/dashboard/subscription",
  automations: "/dashboard/automations",
  marketplace: "/dashboard/integrations/marketplace",
  calendar: "/dashboard/calendar",
  googleCalendarIntegration: "/dashboard/integrations/google_calendar",
} as const;

export const PROTECTED_ROUTE_PREFIXES = ["/dashboard"] as const;
