"use server";

import { syncWebsiteKnowledgeNow } from "@/services/website-knowledge.service";

export async function syncWebsiteKnowledgeNowAction() {
  return syncWebsiteKnowledgeNow();
}
