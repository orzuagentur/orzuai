"use server";

import { z } from "zod";

import {
  createPhoneContact,
  deletePhoneContact,
  listPhoneContacts,
  updatePhoneContact,
  type PhoneContactListScope,
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

const updateSchema = z.object({
  contactId: z.string().uuid(),
  phoneNumber: z.string().trim().min(8).max(32),
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  company: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const deleteSchema = z.object({
  contactId: z.string().uuid(),
});

export async function updatePhoneContactAction(
  input: z.infer<typeof updateSchema>,
): Promise<{ success: true } | { success: false; message: string }> {
  const parsed = updateSchema.safeParse(input);

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

  return updatePhoneContact({
    contactId: parsed.data.contactId,
    phoneNumber: parsed.data.phoneNumber,
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    company: parsed.data.company,
    notes: parsed.data.notes,
  });
}

export async function deletePhoneContactAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { success: false; message: string }> {
  const parsed = deleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid contact.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return deletePhoneContact(parsed.data.contactId);
}

export async function listPhoneContactsAction(
  scope: PhoneContactListScope = "all",
): Promise<Awaited<ReturnType<typeof listPhoneContacts>>> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return [];
  }

  return listPhoneContacts(business.id, scope);
}
