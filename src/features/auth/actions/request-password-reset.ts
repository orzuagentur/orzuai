"use server";

import { requestPasswordReset } from "@/services/auth.service";
import type {
  PasswordResetRequestResult,
  RequestPasswordResetInput,
} from "@/types/auth.types";
import { requestPasswordResetSchema } from "@/types/auth.types";

export async function requestPasswordResetAction(
  input: RequestPasswordResetInput,
): Promise<PasswordResetRequestResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  return requestPasswordReset(parsed.data);
}
