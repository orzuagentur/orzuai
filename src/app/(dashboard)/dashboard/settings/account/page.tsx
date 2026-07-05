import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function LegacyAccountSettingsPage() {
  redirect(DASHBOARD_ROUTES.account);
}
