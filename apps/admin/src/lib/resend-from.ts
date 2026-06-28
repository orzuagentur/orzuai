const RESEND_SENDER_NAME = "OrzuX";

/** Builds Resend `from` — accepts bare email or `Name <email>` from env. */
export function formatResendFromAddress(raw: string): string {
  const value = raw.trim();

  if (value.includes("<") && value.includes(">")) {
    return value;
  }

  return `${RESEND_SENDER_NAME} <${value}>`;
}
