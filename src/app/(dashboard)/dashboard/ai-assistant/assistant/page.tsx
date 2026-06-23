import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type AiAssistantSectionPageProps = {
  searchParams: Promise<{
    channel?: string;
    assistantEdit?: string;
  }>;
};

export default function AiAssistantSectionPage({
  searchParams,
}: AiAssistantSectionPageProps) {
  void searchParams;
  redirect(DASHBOARD_ROUTES.aiAssistant);
}
