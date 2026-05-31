export const APP_ROUTES = {
  home: "/",
  dashboard: "/dashboard",
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
  resetPassword: "/auth/reset-password",
  resetPasswordSuccess: "/auth/reset-password/success",
} as const;

export const DASHBOARD_ROUTES = {
  overview: "/dashboard",
  chats: "/dashboard/chats",
  contacts: "/dashboard/contacts",
  knowledgeBase: "/dashboard/knowledge-base",
  integrations: "/dashboard/integrations",
  aiAssistant: "/dashboard/ai-assistant",
  analytics: "/dashboard/analytics",
  settings: "/dashboard/settings",
  subscription: "/dashboard/subscription",
} as const;

export const PROTECTED_ROUTE_PREFIXES = ["/dashboard"] as const;
