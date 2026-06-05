"use server";

import { updateCannedResponse } from "@/services/canned-responses.service";
import type {
  CannedResponseActionResult,
  UpdateCannedResponseInput,
} from "@/types/canned-response.types";

export async function updateCannedResponseAction(
  input: UpdateCannedResponseInput,
): Promise<CannedResponseActionResult> {
  return updateCannedResponse(input);
}
