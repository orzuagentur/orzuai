import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";

import { BookingPageEditor } from "@/components/booking-page/BookingPageEditor";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";
import { getBusinessBookingSetup } from "@/services/business-calendar-setup.service";
import { getBookingPageById } from "@/services/booking-pages.service";

type EditBookingPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCalendarBookingPage({ params }: EditBookingPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <EditCalendarBookingContent params={params} />
    </Suspense>
  );
}

async function EditCalendarBookingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business) {
    redirect(DASHBOARD_ROUTES.calendar);
  }

  const [setup, page, resources] = await Promise.all([
    getBusinessBookingSetup(business.id),
    getBookingPageById(business.id, id),
    listAllBusinessCalendarResources(business.id, id).catch(() => []),
  ]);

  if (!page) {
    notFound();
  }

  return <BookingPageEditor setup={setup} page={page} resources={resources} />;
}
