"use server";

import { resendVerificationEmail } from "@/services/auth.service";
import type {
  ResendVerificationEmailInput,
  VerificationResult,
} from "@/types/auth.types";
import { resendVerificationEmailSchema } from "@/types/auth.types";

export async function resendVerificationEmailAction(
  input: ResendVerificationEmailInput,
): Promise<VerificationResult> {
  const parsed = resendVerificationEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return resendVerificationEmail(parsed.data);
}
