"use server";

import { deleteContact } from "@/services/contacts.service";
import type {
  ContactActionResult,
  DeleteContactInput,
} from "@/types/contact.types";

export async function deleteContactAction(
  input: DeleteContactInput,
): Promise<ContactActionResult> {
  return deleteContact(input);
}
