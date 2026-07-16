import {
  DEFAULT_CUSTOMER_REPLY_FALLBACK,
  validateCustomerFacingReply,
} from "@/utils/customer-facing-reply-guard";

const DELEGATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(team member|manager|human agent|real person|staff|owner)\b.*\b(will|shall)\b/i, reason: "delegation_promise" },
  { pattern: /\b(will|shall|i['\u2019]ll|we['\u2019]ll)\b.*\b(contact|connect|transfer|escalate|notify|forward|pass|send|share|ask)\b.*\b(you|manager|team|staff|human|owner)\b/i, reason: "delegation_promise" },
  { pattern: /\b(will|shall|i['\u2019]ll|we['\u2019]ll)\b.*\b(check|verify|confirm)\b.*\b(with )?(manager|team|staff|owner|human)\b/i, reason: "manager_callback" },
  { pattern: /\b(i('| a)?m)? (not able|unable) to (book|help|assist|schedule)\b/i, reason: "capability_denial" },
  { pattern: /\b(don't|do not|cannot|can't) have access\b/i, reason: "access_denial" },
  { pattern: /\bno access\b/i, reason: "access_denial" },
  { pattern: /\b(manager|staff)\b.*\b(confirm|call you back|contact you|check availability|get back to you)\b/i, reason: "manager_callback" },
  { pattern: /\bsomeone will (contact|reach|get back to) you\b/i, reason: "callback_promise" },
  { pattern: /\bbooking (is )?(not available|unavailable|not configured)\b/i, reason: "booking_denial" },
  { pattern: /(передам|передаю|передал|перешлю|сообщу|уведомлю)[\s\S]{0,140}(менеджер|менеджеру|администратор|сотрудник|специалист|команд[аеуы])/i, reason: "delegation_promise" },
  { pattern: /(менеджер|администратор|сотрудник|специалист)[\s\S]{0,140}(проверит|подтвердит|свяжется|ответит|сообщит)/i, reason: "manager_callback" },
  { pattern: /(ожидайте|подождите)[\s\S]{0,120}(ответ|провер|менеджер|администратор|сотрудник|специалист)/i, reason: "manager_callback" },
  { pattern: /(не могу|не смогу|нет доступа|невозможно)[\s\S]{0,100}(забронировать|бронь|бронирование|записать|помочь)/i, reason: "capability_denial" },
  { pattern: /(бронь|бронирование|запись)[\s\S]{0,80}(недоступ|не настроен|не могу)/i, reason: "booking_denial" },
  { pattern: /(menejer|xodim|operator)[\s\S]{0,120}(bog'lanadi|tekshiradi|tasdiqlaydi)/i, reason: "manager_callback" },
  { pattern: /(menejerga|xodimga)[\s\S]{0,120}(yuboraman|yetkazaman|beraman)/i, reason: "delegation_promise" },
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
