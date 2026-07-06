import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function SettingsIndexPage() {
  redirect(DASHBOARD_ROUTES.settingsPush);
}
