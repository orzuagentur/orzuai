"use server";

import { updateContactPipelineStage } from "@/services/contacts.service";
import type {
  ContactActionResult,
  UpdateContactPipelineStageInput,
} from "@/types/contact.types";

export async function updateContactPipelineStageAction(
  input: UpdateContactPipelineStageInput,
): Promise<ContactActionResult> {
  return updateContactPipelineStage(input);
}
