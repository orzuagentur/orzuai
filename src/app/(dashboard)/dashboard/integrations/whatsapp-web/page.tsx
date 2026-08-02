import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function WhatsAppWebRedirectPage() {
  redirect(`${DASHBOARD_ROUTES.integrations}/whatsapp_web?section=activate`);
}
