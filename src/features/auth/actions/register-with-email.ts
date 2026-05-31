"use server";

import { registerWithEmail } from "@/services/auth.service";
import type {
  RegisterWithEmailInput,
  RegistrationResult,
} from "@/types/auth.types";
import { registerWithEmailSchema } from "@/types/auth.types";

export async function registerWithEmailAction(
  input: RegisterWithEmailInput,
): Promise<RegistrationResult> {
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
  });
}
