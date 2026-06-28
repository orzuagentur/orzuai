import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BookingPagesManager } from "@/components/booking-page/BookingPagesManager";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listBookingPagesForBusiness } from "@/services/booking-pages.service";

export default function CalendarBookingPagesPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <CalendarBookingPagesContent />
    </Suspense>
  );
}

async function CalendarBookingPagesContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business) {
    redirect(DASHBOARD_ROUTES.calendar);
  }

  const pages = await listBookingPagesForBusiness(business.id).catch(() => []);

  return <BookingPagesManager pages={pages} />;
}
