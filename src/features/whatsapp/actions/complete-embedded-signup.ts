"use server";

import { complete360DialogEmbeddedSignup } from "@/services/whatsapp.service";
import type {
  Complete360DialogEmbeddedSignupInput,
  Complete360DialogEmbeddedSignupResult,
} from "@/types/whatsapp.types";

export async function complete360DialogEmbeddedSignupAction(
  input: Complete360DialogEmbeddedSignupInput,
): Promise<Complete360DialogEmbeddedSignupResult> {
  return complete360DialogEmbeddedSignup(input);
}
