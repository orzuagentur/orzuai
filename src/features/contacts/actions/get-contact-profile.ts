"use server";

import { getContactProfile } from "@/services/contacts.service";
import type { ContactProfileData } from "@/types/contact.types";

export async function getContactProfileAction(
  contactId: string,
): Promise<ContactProfileData | null> {
  return getContactProfile(contactId);
}
