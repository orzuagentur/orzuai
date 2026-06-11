"use server";

import { searchContactsForPicker } from "@/services/contacts.service";

export async function searchContactsForPickerAction(search: string) {
  const items = await searchContactsForPicker(search);
  return { success: true as const, data: items };
}
