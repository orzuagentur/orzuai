"use server";

import { createAutomation } from "@/services/automations.service";
import type { SaveAutomationInput } from "@/types/automations.types";

export async function createAutomationAction(input: SaveAutomationInput) {
  return createAutomation(input);
}
