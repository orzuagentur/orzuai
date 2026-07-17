import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function AiAssistantVoicePage() {
  redirect(`${DASHBOARD_ROUTES.aiAssistantSettings}?tab=voice`);
}
