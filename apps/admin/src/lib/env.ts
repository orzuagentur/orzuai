import { formatResendFromAddress } from "@/lib/resend-from";

export function getAdminAppUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim() ||
    process.env.ADMIN_APP_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3001";
}

export function hasResendEnv(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

export function getResendApiKey(): string {
  const value = process.env.RESEND_API_KEY?.trim();

  if (!value) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return value;
}

export function getResendFromEmail(): string {
  const value = process.env.RESEND_FROM_EMAIL?.trim();

  if (!value) {
    throw new Error("Missing RESEND_FROM_EMAIL");
  }

  return formatResendFromAddress(value);
}
