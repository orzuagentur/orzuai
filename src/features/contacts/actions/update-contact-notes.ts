"use server";

import { z } from "zod";

import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { updateContactNotes } from "@/services/contacts.service";
import type { ContactActionResult } from "@/types/contact.types";

const updateContactNotesSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
  notes: z.string().max(4000),
});

export async function updateContactNotesAction(input: {
  contactId: string;
  notes: string;
}): Promise<ContactActionResult> {
  const parsed = updateContactNotesSchema.safeParse(input);

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

  return updateContactNotes(parsed.data);
}

export async function getContactNotesAction(contactId: string): Promise<
  | { success: true; notes: string | null; contactName: string }
  | { success: false; message: string }
> {
  const parsed = z.string().uuid().safeParse(contactId);

  if (!parsed.success) {
    return { success: false, message: "Invalid contact." };
  }

  const { getContactNotes } = await import("@/services/contacts.service");
  const result = await getContactNotes(parsed.data);

  if (!result) {
    return { success: false, message: CONTACTS_MESSAGES.contactSaveFailed };
  }

  return { success: true, notes: result.notes, contactName: result.name };
}
