"use server";

import { updateContactAdditionalContacts } from "@/services/contacts.service";
import type { ContactActionResult } from "@/types/contact.types";
import {
  additionalContactsSchema,
  type AdditionalContactEntry,
} from "@/utils/contact-additional-contacts";

export async function updateContactAdditionalContactsAction(input: {
  contactId: string;
  additionalContacts: AdditionalContactEntry[];
}): Promise<ContactActionResult> {
  const parsed = additionalContactsSchema.safeParse(input.additionalContacts);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid contact data.",
      },
    };
  }

  return updateContactAdditionalContacts(input.contactId, parsed.data);
}
