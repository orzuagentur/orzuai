"use server";

import { signInWithEmail } from "@/services/auth.service";
import { handlePostLoginSecurityNotify } from "@/services/auth-security-email.service";
import type { LoginResult, SignInWithEmailInput } from "@/types/auth.types";
import { signInWithEmailSchema } from "@/types/auth.types";
import { getRequestLoginContext } from "@/utils/request-login-context";

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

  const result = await signInWithEmail(parsed.data);

  if (result.success) {
    const loginContext = await getRequestLoginContext();
    const supabase = await import("@/lib/supabase/server").then((mod) =>
      mod.createClient(),
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      void handlePostLoginSecurityNotify({
        userId: user.id,
        email: user.email,
        userAgent: loginContext.userAgent,
        ipAddress: loginContext.ipAddress,
      });
    }
  }

  return result;
}
