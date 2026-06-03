"use server";

import { enableWebsiteForms } from "@/services/website-forms.service";

export async function enableWebsiteFormsAction() {
  return enableWebsiteForms();
}
