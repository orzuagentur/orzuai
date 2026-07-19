"use server";

import { verifyEmailWithOtpCode } from "@/services/auth.service";
import type {
  VerificationResult,
  VerifyEmailOtpInput,
} from "@/types/auth.types";
import { verifyEmailOtpSchema } from "@/types/auth.types";

export async function verifyEmailOtpAction(
  input: VerifyEmailOtpInput,
): Promise<VerificationResult> {
  const parsed = verifyEmailOtpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return verifyEmailWithOtpCode(parsed.data);
}
