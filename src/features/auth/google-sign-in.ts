"use client";

import { createClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl } from "@/utils/auth";
import type { AuthActionResult } from "@/types/auth.types";

export async function signInWithGoogle(
  nextPath?: string,
): Promise<AuthActionResult> {
  try {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl(nextPath),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start Google sign-in. Please try again.";

    return {
      success: false,
      error: message,
    };
  }
}
