export async function requestEndVoiceCall(input: {
  callLogId?: string;
  parentCallSid?: string;
  phoneNumber?: string;
}): Promise<{ success: boolean; message?: string }> {
  const callLogId = input.callLogId?.trim();
  const parentCallSid = input.parentCallSid?.trim();
  const phoneNumber = input.phoneNumber?.trim();

  if (!callLogId && !parentCallSid && !phoneNumber) {
    return { success: false, message: "Missing call identifier." };
  }

  const response = await fetch("/api/voice/end-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(callLogId ? { callLogId } : {}),
      ...(parentCallSid ? { parentCallSid } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    }),
  });

  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;

  if (!response.ok || !result?.success) {
    return {
      success: false,
      message: result?.message ?? "Unable to end call.",
    };
  }

  return { success: true, message: result.message };
}

export async function requestReleaseOperatorVoiceLine(input?: {
  phoneNumber?: string;
}): Promise<{ success: boolean; message?: string; released: number }> {
  const response = await fetch("/api/voice/release-line", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input?.phoneNumber?.trim()
        ? { phoneNumber: input.phoneNumber.trim() }
        : {}),
    }),
  });

  const result = (await response.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    released?: number;
  } | null;

  if (!response.ok || !result?.success) {
    return {
      success: false,
      message: result?.message ?? "Unable to release line.",
      released: result?.released ?? 0,
    };
  }

  return {
    success: true,
    message: result.message,
    released: result.released ?? 0,
  };
}
