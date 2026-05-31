"use server";

import { updatePassword } from "@/services/auth.service";
import type {
  PasswordUpdateResult,
  ResetPasswordInput,
} from "@/types/auth.types";
import { resetPasswordSchema } from "@/types/auth.types";

export async function updatePasswordAction(
  input: ResetPasswordInput,
): Promise<PasswordUpdateResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return updatePassword({
    password: parsed.data.password,
  });
}
