import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DEFAULT_INTEGRATION_CHANNEL } from "@/features/integrations";

export default function IntegrationsIndexPage() {
  redirect(
    `${DASHBOARD_ROUTES.integrations}/${DEFAULT_INTEGRATION_CHANNEL}?section=activate`,
  );
}
