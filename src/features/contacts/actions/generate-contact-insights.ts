"use server";

import { generateContactInsights } from "@/services/contacts.service";
import type {
  GenerateContactInsightsInput,
  GenerateContactInsightsResult,
} from "@/types/contact.types";

export async function generateContactInsightsAction(
  input: GenerateContactInsightsInput,
): Promise<GenerateContactInsightsResult> {
  return generateContactInsights(input);
}
