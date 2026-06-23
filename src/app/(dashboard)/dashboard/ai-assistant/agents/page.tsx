import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type AiAgentsSectionPageProps = {
  searchParams: Promise<{
    channel?: string;
    agent?: string;
    step?: string;
    goal?: string;
    q?: string;
    setup?: string;
    edit?: string;
    analytics?: string;
  }>;
};

export default function AiAgentsSectionPage({
  searchParams,
}: AiAgentsSectionPageProps) {
  void searchParams;
  redirect(DASHBOARD_ROUTES.aiAssistant);
}
