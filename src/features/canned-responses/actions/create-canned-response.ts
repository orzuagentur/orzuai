"use server";

import { createCannedResponse } from "@/services/canned-responses.service";
import type {
  CannedResponseActionResult,
  CreateCannedResponseInput,
} from "@/types/canned-response.types";

export async function createCannedResponseAction(
  input: CreateCannedResponseInput,
): Promise<CannedResponseActionResult> {
  return createCannedResponse(input);
}
