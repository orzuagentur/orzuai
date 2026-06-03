"use server";

import { regenerateWebsiteFormApiKey } from "@/services/website-forms.service";

export async function regenerateWebsiteFormApiKeyAction() {
  return regenerateWebsiteFormApiKey();
}
