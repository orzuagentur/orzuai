import { sanitizeCustomerFacingReply } from "@/utils/customer-facing-reply-guard";

const INTERNAL_SUMMARY_PATTERNS = [
  /^saved to crm:/i,
  /manager note/i,
  /\binternal note\b/i,
  /\bteam-only\b/i,
  /\bcrm\b/i,
  /\bthe customer is\b/i,
  /\bcustomer is impatient\b/i,
  /\bcustomer wants\b/i,
  /\bowner as soon as possible\b/i,
  /\bhuman handoff\b/i,
  /\borchestrator\b/i,
  /\bnotified\b.*\b(team|manager)\b/i,
  /\bmanager\b.*\b(join|connect)\b/i,
  /(передал|передам|передаю)[\s\S]{0,120}(менеджер|менеджеру|администратор|сотрудник|специалист)/i,
  /\bmenejerga yetkazdim\b/i,
];

const INTERNAL_ACTION_LABEL_PATTERNS = [
  /^manager note added/i,
  /^note added in chat$/i,
  /^contact updated:/i,
  /^crm\b/i,
];

const BOOKING_SUCCESS_ACTION_PATTERNS = [
  /^booking confirmed/i,
  /^calendar event created/i,
];

const BOOKING_FAILURE_ACTION_PATTERNS = [
  /^booking not confirmed:/i,
  /^booking not created:/i,
  /^could not create booking:/i,
];

const BOOKING_CONFIRMATION_SUMMARY_PATTERNS = [
  /\b(booking|reservation|appointment)\b.*\b(confirmed|booked|scheduled)\b/i,
  /(бронь|бронирование|запись|резерв)[\s\S]{0,120}(подтвержден|подтверждена|создан|создана|оформлен|оформлена|забронирован|забронирована)/i,
  /(забронировал|забронировала|записал|записала|подтвердил|подтвердила)/i,
];

const CUSTOMER_VISIBLE_ACTION_PATTERNS = [
  ...BOOKING_SUCCESS_ACTION_PATTERNS,
  ...BOOKING_FAILURE_ACTION_PATTERNS,
  /task created:/i,
  /deal created:/i,
  /contact created:/i,
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripBookingFailurePrefix(label: string): string {
  return label.replace(/^booking not (confirmed|created):\s*/i, "").trim();
}

function hasBookingFailureWithoutSuccess(actionsApplied: string[]): boolean {
  const hasFailure = actionsApplied.some((label) =>
    BOOKING_FAILURE_ACTION_PATTERNS.some((pattern) => pattern.test(normalizeText(label))),
  );
  const hasSuccess = actionsApplied.some((label) =>
    BOOKING_SUCCESS_ACTION_PATTERNS.some((pattern) => pattern.test(normalizeText(label))),
  );

  return hasFailure && !hasSuccess;
}

function summaryLooksLikeBookingConfirmation(summary: string): boolean {
  const normalized = normalizeText(summary);

  return BOOKING_CONFIRMATION_SUMMARY_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function looksLikeInternalAgentSummary(text: string): boolean {
  const normalized = normalizeText(text);

  if (!normalized) {
    return true;
  }

  return INTERNAL_SUMMARY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function filterCustomerVisibleActionLabels(
  actionsApplied: string[],
): string[] {
  return actionsApplied.filter((label) => {
    const normalized = normalizeText(label);

    if (!normalized) {
      return false;
    }

    if (
      INTERNAL_ACTION_LABEL_PATTERNS.some((pattern) =>
        pattern.test(normalized),
      )
    ) {
      return false;
    }

    return CUSTOMER_VISIBLE_ACTION_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    );
  });
}

export function hasCustomerVisibleOutcome(actionsApplied: string[]): boolean {
  return filterCustomerVisibleActionLabels(actionsApplied).length > 0;
}

export function sanitizeCustomerFacingSummary(
  summary: string | null | undefined,
): string | null {
  const normalized = normalizeText(summary ?? "");

  if (!normalized || looksLikeInternalAgentSummary(normalized)) {
    return null;
  }

  const guarded = sanitizeCustomerFacingReply(normalized, { fallback: null });

  return guarded.text;
}

export function messagesAreLikelyDuplicates(
  left: string,
  right: string,
): boolean {
  const a = normalizeText(left).toLowerCase();
  const b = normalizeText(right).toLowerCase();

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.length >= 24 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  return false;
}

export function shouldSendCustomerActionFollowUp(input: {
  actionsApplied: string[];
  clientSummary?: string | null;
}): boolean {
  const sanitizedSummary = sanitizeCustomerFacingSummary(input.clientSummary);
  const visibleActions = filterCustomerVisibleActionLabels(input.actionsApplied);

  if (
    sanitizedSummary &&
    !(
      hasBookingFailureWithoutSuccess(input.actionsApplied) &&
      summaryLooksLikeBookingConfirmation(sanitizedSummary)
    )
  ) {
    return true;
  }

  return visibleActions.length > 0 && hasCustomerVisibleOutcome(visibleActions);
}

export function buildBookingFailureFollowUp(input: {
  language: string;
  actionsApplied: string[];
}): string | null {
  const failureLabel = input.actionsApplied.find((label) =>
    BOOKING_FAILURE_ACTION_PATTERNS.some((pattern) => pattern.test(normalizeText(label))),
  );

  if (!failureLabel) {
    return null;
  }

  const reason = stripBookingFailurePrefix(failureLabel);
  const language = input.language.trim();

  if (language === "Russian") {
    return reason
      ? `Пока не получилось подтвердить бронь: ${reason}`
      : "Пока не получилось подтвердить бронь. Я проверю другой доступный вариант здесь в чате.";
  }

  if (language === "Uzbek") {
    return reason
      ? `Bronni tasdiqlab bo'lmadi: ${reason}`
      : "Bronni hozircha tasdiqlab bo'lmadi. Shu chatda boshqa mos variantni tekshiraman.";
  }

  return reason
    ? `I could not confirm the booking yet: ${reason}`
    : "I could not confirm the booking yet. I will keep checking the best available option here.";
}
