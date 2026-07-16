import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

/** AI generate studio removed — website scan fills category cards instead. */
export default function AiAssistantKnowledgeGeneratePage() {
  redirect(DASHBOARD_ROUTES.aiAssistantKnowledge);
}
