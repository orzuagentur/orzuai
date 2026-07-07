"use server";

import { updatePassword } from "@/services/auth.service";
import { notifyPasswordChanged } from "@/services/auth-security-email.service";
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

  const result = await updatePassword({
    password: parsed.data.password,
  });

  if (result.success) {
    const supabase = await import("@/lib/supabase/server").then((mod) =>
      mod.createClient(),
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      void notifyPasswordChanged({
        userId: user.id,
        email: user.email,
      });
    }
  }

  return result;
}
