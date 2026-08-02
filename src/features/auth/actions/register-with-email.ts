"use server";

import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { registerWithEmail } from "@/services/auth.service";
import type {
  RegisterWithEmailInput,
  RegistrationResult,
} from "@/types/auth.types";
import { registerWithEmailSchema } from "@/types/auth.types";

export async function registerWithEmailAction(
  input: RegisterWithEmailInput,
  turnstileToken?: string,
): Promise<RegistrationResult> {
  const turnstile = await verifyTurnstileToken(turnstileToken);

  if (!turnstile.allowed) {
    return {
      success: false,
      error: {
        code: "REGISTRATION_FAILED",
        message: "Verification failed. Please try again.",
      },
    };
  }

  const parsed = registerWithEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return registerWithEmail({
    email: parsed.data.email,
    password: parsed.data.password,
    businessName: parsed.data.businessName,
  });
}
