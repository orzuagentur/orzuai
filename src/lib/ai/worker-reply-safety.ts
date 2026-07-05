import {
  DEFAULT_CUSTOMER_REPLY_FALLBACK,
  validateCustomerFacingReply,
} from "@/utils/customer-facing-reply-guard";

const DELEGATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(team member|manager|human agent|real person)\b.*\b(will|shall)\b/i, reason: "delegation_promise" },
  { pattern: /\b(will|shall)\b.*\b(contact|connect|transfer|escalate|notify)\b.*\b(you|manager|team|staff)\b/i, reason: "delegation_promise" },
  { pattern: /\b(i('| a)?m)? (not able|unable) to (book|help|assist|schedule)\b/i, reason: "capability_denial" },
  { pattern: /\b(don't|do not|cannot|can't) have access\b/i, reason: "access_denial" },
  { pattern: /\bno access\b/i, reason: "access_denial" },
  { pattern: /\b(manager|менеджер)\b.*\b(confirm|call you back|contact you|свяжется)\b/i, reason: "manager_callback" },
  { pattern: /\b(переда|переключ|позов).*?(менеджер|человек)/i, reason: "manager_callback" },
  { pattern: /\bsomeone will (contact|reach|get back to) you\b/i, reason: "callback_promise" },
  { pattern: /\bbooking (is )?(not available|unavailable|not configured)\b/i, reason: "booking_denial" },
];

export function containsWorkerUnsafeReplyLanguage(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return "empty";
  }

  for (const { pattern, reason } of DELEGATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return reason;
    }
  }

  return null;
}

export function sanitizeWorkerFacingReply(
  value: string | null | undefined,
  options?: { fallback?: string | null },
): { text: string | null; rewritten: boolean; reason?: string } {
  const validation = validateCustomerFacingReply(value);

  if (!validation.safe) {
    return {
      text:
        options?.fallback === undefined
          ? DEFAULT_CUSTOMER_REPLY_FALLBACK
          : options.fallback,
      rewritten: true,
      reason: validation.reason,
    };
  }

  const unsafeReason = containsWorkerUnsafeReplyLanguage(validation.text);

  if (unsafeReason) {
    return {
      text:
        options?.fallback === undefined
          ? DEFAULT_CUSTOMER_REPLY_FALLBACK
          : options.fallback,
      rewritten: true,
      reason: unsafeReason,
    };
  }

  return { text: validation.text, rewritten: false };
}
