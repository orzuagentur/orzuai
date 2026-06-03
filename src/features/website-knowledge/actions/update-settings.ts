"use server";

import { saveWebsiteKnowledgeSetup } from "@/services/website-knowledge.service";
import type { WebsiteKnowledgeSetupInput } from "@/types/website-knowledge.types";

export async function updateWebsiteKnowledgeSettingsAction(
  input: WebsiteKnowledgeSetupInput,
) {
  return saveWebsiteKnowledgeSetup(input);
}
