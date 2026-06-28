import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BookingPageEditor } from "@/components/booking-page/BookingPageEditor";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getBusinessBookingSetup } from "@/services/business-calendar-setup.service";

export default function CalendarBookingNewPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <CalendarBookingNewContent />
    </Suspense>
  );
}

async function CalendarBookingNewContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business) {
    redirect(DASHBOARD_ROUTES.calendar);
  }

  const setup = await getBusinessBookingSetup(business.id);

  return <BookingPageEditor setup={setup} page={null} resources={[]} />;
}
