"use server";

import { signInWithMagicLink } from "@/services/auth.service";
import type {
  MagicLinkResult,
  SignInWithMagicLinkInput,
} from "@/types/auth.types";

export async function signInWithMagicLinkAction(
  input: SignInWithMagicLinkInput,
  nextPath?: string,
): Promise<MagicLinkResult> {
  return signInWithMagicLink(input, nextPath);
}
