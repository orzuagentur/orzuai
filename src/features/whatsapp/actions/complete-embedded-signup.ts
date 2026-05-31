"use server";

import { completeEmbeddedSignup } from "@/services/whatsapp.service";
import type {
  CompleteEmbeddedSignupInput,
  CompleteEmbeddedSignupResult,
} from "@/types/whatsapp.types";

export async function completeEmbeddedSignupAction(
  input: CompleteEmbeddedSignupInput,
): Promise<CompleteEmbeddedSignupResult> {
  return completeEmbeddedSignup(input);
}
