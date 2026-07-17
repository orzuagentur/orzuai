import { SUPPORT_EMAIL } from "../../constants/app-origin";

export const EMAIL_APP_NAME = "OrzuX";

export const EMAIL_TAGLINE = "AI Business Communication Platform";

export const EMAIL_SUBJECTS = {
  verification: "Confirm your OrzuX email",
  verificationCode: "Your OrzuX verification code",
  passwordReset: "Reset your OrzuX password",
  magicLink: "Sign in to OrzuX",
  googleWelcome: "Welcome to OrzuX — glad you're here",
  teamInvite: "You've been invited to join a team on OrzuX",
  systemNotification: "Notification from OrzuX",
  onboardingDay0: "Welcome to OrzuX — let's get you set up",
  onboardingDay1: "Day 1: connect your first channel",
  onboardingDay2: "Day 2: train your AI with knowledge",
  onboardingDay3: "Day 3: turn on your AI assistant",
  onboardingDay5: "Day 5: automate your follow-ups",
  onboardingDay7: "Day 7: measure what is working",
} as const;

export const EMAIL_BRAND = {
  primary: "#7c3aed",
  primaryDark: "#6d28d9",
  primarySoft: "rgba(124,58,237,0.12)",
  background: "#f8fafc",
  surface: "#f4f4f5",
  card: "#ffffff",
  foreground: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
} as const;

export const EMAIL_FOOTER_SUPPORT = `Questions? Reply to this email or contact ${SUPPORT_EMAIL}.`;

export const PLATFORM_FEATURE_HIGHLIGHTS = [
  "Unified inbox for WhatsApp, Instagram, Telegram, and more",
  "AI assistant trained on your business knowledge",
  "CRM, deals, and customer context in one place",
  "Analytics to scale your team",
] as const;
