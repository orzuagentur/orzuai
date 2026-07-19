"use server";

import { verifyRecoveryOtpCode } from "@/services/auth.service";
import type {
  PasswordResetRequestResult,
  VerifyRecoveryOtpInput,
} from "@/types/auth.types";
import { verifyRecoveryOtpSchema } from "@/types/auth.types";

export async function verifyRecoveryOtpAction(
  input: VerifyRecoveryOtpInput,
): Promise<PasswordResetRequestResult> {
  const parsed = verifyRecoveryOtpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return verifyRecoveryOtpCode(parsed.data);
}
