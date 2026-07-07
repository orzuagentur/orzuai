import { EMAIL_APP_NAME } from "../email/constants";

/** Builds Resend `from` — accepts bare email or `Name <email>` from env. */
export function formatResendFromAddress(raw: string): string {
  const value = raw.trim();

  if (value.includes("<") && value.includes(">")) {
    return value;
  }

  return `${EMAIL_APP_NAME} <${value}>`;
}
