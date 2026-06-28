import { redirect } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function CalendarBookingPagesPage() {
  redirect(DASHBOARD_ROUTES.calendar);
}
