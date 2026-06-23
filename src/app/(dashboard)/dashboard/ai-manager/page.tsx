import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type AiManagerPageProps = {
  searchParams: Promise<{
    channel?: string;
  }>;
};

export default async function AiManagerPage({ searchParams }: AiManagerPageProps) {
  void searchParams;
  redirect(DASHBOARD_ROUTES.aiAssistant);
}
