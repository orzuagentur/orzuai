import {
  BILLING_EMAIL,
  CONTACT_EMAIL,
  NOREPLY_EMAIL,
  SECURITY_EMAIL,
} from "../../constants/app-origin";
import { formatResendFromAddress } from "../resend/from-address";

export type PlatformEmailSender = "security" | "noreply" | "billing" | "hello";

export const PLATFORM_EMAIL_ADDRESSES: Record<PlatformEmailSender, string> = {
  security: SECURITY_EMAIL,
  noreply: NOREPLY_EMAIL,
  billing: BILLING_EMAIL,
  hello: CONTACT_EMAIL,
};

export const PLATFORM_EMAIL_SENDER_LABELS: Record<PlatformEmailSender, string> = {
  security: "Security & auth",
  noreply: "Automated notifications",
  billing: "Billing & subscriptions",
  hello: "Welcome & team",
};

const TEMPLATE_FROM_SENDER: Record<string, PlatformEmailSender> = {
  verification: "security",
  magic_link: "security",
  password_reset: "security",
  password_changed: "security",
  new_device_login: "security",
  admin_invite: "security",
  google_welcome: "hello",
  team_invite: "hello",
  platform_broadcast: "hello",
  subscription_purchased: "billing",
  subscription_renewed: "billing",
  subscription_plan_changed: "billing",
  payment_card_failed: "billing",
  payment_bank_failed: "billing",
  card_expiring: "billing",
  onboarding_drip: "noreply",
  lead_follow_up: "noreply",
  booking_confirmation: "noreply",
  booking_action: "noreply",
  system_notification: "noreply",
};

export function resolvePlatformEmailSender(
  templateId?: string | null,
): PlatformEmailSender {
  if (!templateId?.trim()) {
    return "noreply";
  }

  return TEMPLATE_FROM_SENDER[templateId.trim()] ?? "noreply";
}

export function getEmailFromAddress(templateId?: string | null): string {
  const sender = resolvePlatformEmailSender(templateId);
  return formatResendFromAddress(PLATFORM_EMAIL_ADDRESSES[sender]);
}

export function getEmailFromAddressLabel(templateId?: string | null): string {
  const sender = resolvePlatformEmailSender(templateId);
  return `${PLATFORM_EMAIL_SENDER_LABELS[sender]} · ${PLATFORM_EMAIL_ADDRESSES[sender]}`;
}

export const FROM_EMAIL_PRESET_OPTIONS = (
  Object.entries(PLATFORM_EMAIL_SENDER_LABELS) as Array<
    [PlatformEmailSender, string]
  >
).map(([key, label]) => ({
  value: key,
  label: `${label} (${PLATFORM_EMAIL_ADDRESSES[key]})`,
}));

export function normalizeTemplateFromEmailInput(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "default") {
    return null;
  }

  if (trimmed in PLATFORM_EMAIL_ADDRESSES) {
    return trimmed;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function resolveFromEmailDbValue(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const value = raw.trim();

  if (value in PLATFORM_EMAIL_ADDRESSES) {
    return formatResendFromAddress(
      PLATFORM_EMAIL_ADDRESSES[value as PlatformEmailSender],
    );
  }

  return formatResendFromAddress(value);
}
