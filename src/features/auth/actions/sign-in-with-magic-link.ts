"use server";

import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { signInWithMagicLink } from "@/services/auth.service";
import type {
  MagicLinkResult,
  SignInWithMagicLinkInput,
} from "@/types/auth.types";

export async function signInWithMagicLinkAction(
  input: SignInWithMagicLinkInput,
  nextPath?: string,
  turnstileToken?: string,
): Promise<MagicLinkResult> {
  const turnstile = await verifyTurnstileToken(turnstileToken);

  if (!turnstile.allowed) {
    return {
      success: false,
      error: {
        code: "MAGIC_LINK_FAILED",
        message: "Verification failed. Please try again.",
      },
    };
  }

  return signInWithMagicLink(input, nextPath);
}
