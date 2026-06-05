"use server";

import { updateContact } from "@/services/contacts.service";
import type {
  ContactActionResult,
  UpdateContactInput,
} from "@/types/contact.types";

export async function updateContactAction(
  input: UpdateContactInput,
): Promise<ContactActionResult> {
  return updateContact(input);
}
