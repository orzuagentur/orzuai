import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function LegacyProfileSettingsPage() {
  redirect(DASHBOARD_ROUTES.profile);
}
