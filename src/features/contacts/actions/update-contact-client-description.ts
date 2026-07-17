"use server";

import { z } from "zod";

import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { updateContactClientDescription } from "@/services/contacts.service";
import type { ContactActionResult } from "@/types/contact.types";

const updateContactClientDescriptionSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
  description: z.string().max(800),
});

export async function updateContactClientDescriptionAction(input: {
  contactId: string;
  description: string;
}): Promise<ContactActionResult> {
  const parsed = updateContactClientDescriptionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.contactSaveFailed,
      },
    };
  }

  return updateContactClientDescription(parsed.data);
}
