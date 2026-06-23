import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type KnowledgeBasePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  void searchParams;
  redirect(DASHBOARD_ROUTES.aiAssistant);
}
