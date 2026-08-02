"use server";

import { listContactFieldIcons } from "@/services/contacts.service";
import type { ContactFieldIconOption } from "@/types/contact.types";

export async function listContactFieldIconsAction(): Promise<
  ContactFieldIconOption[]
> {
  return listContactFieldIcons();
}
