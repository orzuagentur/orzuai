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

export function getVoiceCallListKey(call: VoiceInboxCallListItem): string {
  const digits = phoneDigits(call.phoneNumber);
  if (digits) {
    return `phone:${digits}`;
  }

  if (call.contactId?.trim()) {
    return `contact:${call.contactId}`;
  }

  return `call:${call.id}`;
}

export function isSameVoiceCallContact(
  left: VoiceInboxCallListItem,
  right: VoiceInboxCallListItem,
): boolean {
  return getVoiceCallListKey(left) === getVoiceCallListKey(right);
}

export function dedupeVoiceCallsByContact(
  calls: VoiceInboxCallListItem[],
): VoiceInboxCallListItem[] {
  const latestByKey = new Map<string, VoiceInboxCallListItem>();

  for (const call of calls) {
    const key = getVoiceCallListKey(call);
    const existing = latestByKey.get(key);

    if (!existing) {
      latestByKey.set(key, call);
      continue;
    }

    const incomingIsNewer =
      new Date(call.createdAt).getTime() > new Date(existing.createdAt).getTime();
    const newer = incomingIsNewer ? call : existing;
    const older = incomingIsNewer ? existing : call;

    latestByKey.set(key, {
      ...newer,
      contactName: newer.contactName ?? older.contactName ?? null,
      contactId: newer.contactId ?? older.contactId ?? null,
    });
  }

  return Array.from(latestByKey.values()).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function enrichVoiceCallsWithPhonebook(
  calls: VoiceInboxCallListItem[],
  phonebook: Array<{ id: string; name: string; phoneNumber: string }>,
): VoiceInboxCallListItem[] {
  if (phonebook.length === 0) {
    return calls;
  }

  return calls.map((call) => {
    if (call.contactName?.trim()) {
      return call;
    }

    const match = phonebook.find((contact) =>
      phonesMatch(contact.phoneNumber, call.phoneNumber),
    );

    if (!match) {
      return call;
    }

    return {
      ...call,
      contactName: match.name,
      contactId: call.contactId ?? match.id,
    };
  });
}

export function isPhoneInPhonebook(
  phoneNumber: string,
  phonebook: Array<{ phoneNumber: string }>,
): boolean {
  const phone = phoneNumber.trim();
  if (!phone) {
    return false;
  }

  return phonebook.some((contact) => phonesMatch(contact.phoneNumber, phone));
}

export function countVoiceCallsByContactKey(
  calls: VoiceInboxCallListItem[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const call of calls) {
    const key = getVoiceCallListKey(call);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
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
