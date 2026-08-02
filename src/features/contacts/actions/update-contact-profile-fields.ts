"use server";

import { updateContactProfileFields } from "@/services/contacts.service";
import type { ContactActionResult } from "@/types/contact.types";
import {
  contactProfileFieldsSchema,
  type ContactProfileFieldEntry,
} from "@/utils/contact-profile-fields";

export async function updateContactProfileFieldsAction(input: {
  contactId: string;
  profileFields: ContactProfileFieldEntry[];
}): Promise<ContactActionResult> {
  const parsed = contactProfileFieldsSchema.safeParse(input.profileFields);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid custom fields.",
      },
    };
  }

  return updateContactProfileFields(input.contactId, parsed.data);
}
