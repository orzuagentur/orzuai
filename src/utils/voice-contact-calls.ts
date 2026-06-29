import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);

  if (!left || !right) {
    return false;
  }

  return left === right || left.endsWith(right) || right.endsWith(left);
}

export function getCallsForContact(
  calls: VoiceInboxCallListItem[],
  input: { contactId?: string | null; phoneNumber?: string | null },
): VoiceInboxCallListItem[] {
  const contactId = input.contactId?.trim();
  const phone = input.phoneNumber?.trim();

  if (!contactId && !phone) {
    return [];
  }

  return calls
    .filter((call) => {
      if (contactId && call.contactId === contactId) {
        return true;
      }

      if (phone && phonesMatch(call.phoneNumber, phone)) {
        return true;
      }

      return false;
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

export type ContactCallSummary = {
  totalCalls: number;
  totalDurationSeconds: number;
  completedCalls: number;
  missedCalls: number;
};

export function summarizeContactCalls(
  calls: VoiceInboxCallListItem[],
): ContactCallSummary {
  return calls.reduce<ContactCallSummary>(
    (summary, call) => {
      summary.totalCalls += 1;
      summary.totalDurationSeconds += call.durationSeconds ?? 0;

      if (call.status === "completed") {
        summary.completedCalls += 1;
      }

      if (
        ["missed", "no-answer", "failed", "busy", "canceled"].includes(call.status)
      ) {
        summary.missedCalls += 1;
      }

      return summary;
    },
    {
      totalCalls: 0,
      totalDurationSeconds: 0,
      completedCalls: 0,
      missedCalls: 0,
    },
  );
}
