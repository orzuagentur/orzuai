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
  /\bпередал\b.*\bменеджер/i,
  /\bmenejerga yetkazdim\b/i,
];

const INTERNAL_ACTION_LABEL_PATTERNS = [
  /^manager note added/i,
  /^note added in chat$/i,
  /^contact updated:/i,
  /^crm\b/i,
];

const CUSTOMER_VISIBLE_ACTION_PATTERNS = [
  /calendar event created/i,
  /task created:/i,
  /deal created:/i,
  /appointment/i,
  /booking request saved/i,
  /manager will confirm/i,
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

    return !INTERNAL_ACTION_LABEL_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    );
  });
}

export function hasCustomerVisibleOutcome(actionsApplied: string[]): boolean {
  const visible = filterCustomerVisibleActionLabels(actionsApplied);

  return visible.some((label) =>
    CUSTOMER_VISIBLE_ACTION_PATTERNS.some((pattern) => pattern.test(label)),
  );
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

  if (sanitizedSummary) {
    return true;
  }

  return visibleActions.length > 0 && hasCustomerVisibleOutcome(visibleActions);
}
