import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { buildLegacyAiAssistantRedirectHref } from "@/utils/ai-assistant-url";

type AiAssistantPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AiAssistantPage({
  searchParams,
}: AiAssistantPageProps) {
  const params = await searchParams;
  const legacyRedirect = buildLegacyAiAssistantRedirectHref(params);

  redirect(legacyRedirect ?? DASHBOARD_ROUTES.aiAssistantSection);
}
