import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type AutomationsPageProps = {
  searchParams: Promise<{
    tab?: string;
    rule?: string;
    workflow?: string;
    step?: string;
  }>;
};

export default function AutomationsPage({ searchParams }: AutomationsPageProps) {
  void searchParams;
  redirect(DASHBOARD_ROUTES.aiAssistant);
}
