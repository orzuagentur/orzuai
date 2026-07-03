import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

type KnowledgeBasePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

export default async function KnowledgeBasePage({
  searchParams,
}: KnowledgeBasePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  query.set("tab", "knowledge");

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.category) {
    query.set("category", params.category);
  }

  redirect(`${DASHBOARD_ROUTES.aiAssistant}?${query.toString()}`);
}
