"use server";

import { signInWithEmail } from "@/services/auth.service";
import type { LoginResult, SignInWithEmailInput } from "@/types/auth.types";
import { signInWithEmailSchema } from "@/types/auth.types";

export async function signInWithEmailAction(
  input: SignInWithEmailInput,
): Promise<LoginResult> {
  const parsed = signInWithEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return signInWithEmail(parsed.data);
}
