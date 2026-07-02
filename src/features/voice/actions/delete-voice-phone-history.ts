"use server";

import { z } from "zod";

import { deleteVoicePhoneHistory } from "@/services/voice-phone-history.service";

const deleteSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(32),
});

export async function deleteVoicePhoneHistoryAction(
  input: z.infer<typeof deleteSchema>,
): Promise<
  | { success: true; deletedCount: number }
  | { success: false; message: string }
> {
  const parsed = deleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid phone number.",
    };
  }

  return deleteVoicePhoneHistory(parsed.data.phoneNumber);
}
