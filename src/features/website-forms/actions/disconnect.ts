"use server";

import { disconnectWebsiteForms } from "@/services/website-forms.service";

export async function disconnectWebsiteFormsAction() {
  return disconnectWebsiteForms();
}
