"use server";

import {
  saveWebsiteKnowledgeSetup,
  syncWebsiteKnowledgeNow,
} from "@/services/website-knowledge.service";
import type { WebsiteKnowledgeSetupInput } from "@/types/website-knowledge.types";

export async function saveWebsiteKnowledgeSetupAction(
  input: WebsiteKnowledgeSetupInput,
) {
  const saved = await saveWebsiteKnowledgeSetup(input);

  if (!saved.success) {
    return saved;
  }

  return syncWebsiteKnowledgeNow();
}
