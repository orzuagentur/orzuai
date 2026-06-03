"use server";

import { completeInstagramEmbeddedSignup } from "@/services/instagram.service";
import type {
  CompleteInstagramEmbeddedSignupInput,
  CompleteInstagramEmbeddedSignupResult,
} from "@/types/instagram.types";

export async function completeInstagramEmbeddedSignupAction(
  input: CompleteInstagramEmbeddedSignupInput,
): Promise<CompleteInstagramEmbeddedSignupResult> {
  return completeInstagramEmbeddedSignup(input);
}
