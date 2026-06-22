"use server";

import { signInWithGoogle } from "@/services/auth.service";
import type { GoogleSignInResult } from "@/types/auth.types";

export async function signInWithGoogleAction(
  nextPath?: string,
): Promise<GoogleSignInResult> {
  return signInWithGoogle(nextPath);
}
