"use server";

import { updateWebsiteFormsSettings } from "@/services/website-forms.service";
import type { UpdateWebsiteFormsSettingsInput } from "@/types/website-forms.types";

export async function updateWebsiteFormsSettingsAction(
  input: UpdateWebsiteFormsSettingsInput,
) {
  return updateWebsiteFormsSettings(input);
}
