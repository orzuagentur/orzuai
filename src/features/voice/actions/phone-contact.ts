"use server";

import { z } from "zod";

import {
  createPhoneContact,
  listPhoneContacts,
} from "@/services/phone-contact.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

const createSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(32),
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  company: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function createPhoneContactAction(
  input: z.infer<typeof createSchema>,
): Promise<
  | {
      success: true;
      contactId: string;
      conversationId: string;
    }
  | { success: false; message: string }
> {
  const parsed = createSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid contact details.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return createPhoneContact({
    phoneNumber: parsed.data.phoneNumber,
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    company: parsed.data.company,
    notes: parsed.data.notes,
  });
}

export async function listPhoneContactsAction(): Promise<
  Awaited<ReturnType<typeof listPhoneContacts>>
> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return [];
  }

  return listPhoneContacts(business.id);
}
