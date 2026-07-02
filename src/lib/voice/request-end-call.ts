export async function requestEndVoiceCall(input: {
  callLogId?: string;
  parentCallSid?: string;
}): Promise<{ success: boolean; message?: string }> {
  const callLogId = input.callLogId?.trim();
  const parentCallSid = input.parentCallSid?.trim();

  if (!callLogId && !parentCallSid) {
    return { success: false, message: "Missing call identifier." };
  }

  const response = await fetch("/api/voice/end-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(callLogId ? { callLogId } : {}),
      ...(parentCallSid ? { parentCallSid } : {}),
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
