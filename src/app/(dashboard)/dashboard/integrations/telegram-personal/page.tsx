import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function TelegramPersonalRedirectPage() {
  redirect(`${DASHBOARD_ROUTES.integrations}/telegram_user?section=activate`);
}
