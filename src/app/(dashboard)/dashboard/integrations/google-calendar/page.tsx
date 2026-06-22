import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function LegacyGoogleCalendarIntegrationPage() {
  redirect(`${DASHBOARD_ROUTES.integrations}/google_calendar?section=activate`);
}
