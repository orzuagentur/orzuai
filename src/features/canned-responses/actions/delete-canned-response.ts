"use server";

import { deleteCannedResponse } from "@/services/canned-responses.service";
import type {
  CannedResponseActionResult,
  DeleteCannedResponseInput,
} from "@/types/canned-response.types";

export async function deleteCannedResponseAction(
  input: DeleteCannedResponseInput,
): Promise<CannedResponseActionResult> {
  return deleteCannedResponse(input);
}
