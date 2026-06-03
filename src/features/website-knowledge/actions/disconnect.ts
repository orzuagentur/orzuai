"use server";

import { disconnectWebsiteKnowledge } from "@/services/website-knowledge.service";

export async function disconnectWebsiteKnowledgeAction() {
  return disconnectWebsiteKnowledge();
}
