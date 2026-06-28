import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CalendarNotificationsMarkRead } from "@/components/google-calendar/CalendarNotificationsMarkRead";
import { OrzuxCalendar } from "@/components/orzux-calendar/OrzuxCalendar";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getBusinessBookingSetup } from "@/services/business-calendar-setup.service";
import { listBookingPagesForBusiness } from "@/services/booking-pages.service";
import {
  listCalendarEventsForBusiness,
  listCalendarTasksForBusiness,
  mergeCalendarEvents,
  syncGoogleCalendarEventsForBusiness,
} from "@/services/calendar-events.service";
import { getCalendarAvailabilityPageData } from "@/services/calendar-availability.service";
import {
  getGoogleCalendarConnection,
} from "@/services/google-calendar.service";

export default function CalendarPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <CalendarPageContent />
    </Suspense>
  );
}

async function CalendarPageContent() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business) {
    redirect(GOOGLE_CALENDAR_INTEGRATION_HREF);
  }

  const connection = await getGoogleCalendarConnection(business.id);
  const googleConnected = connection?.status === "connected";
  const bookingSetup = await getBusinessBookingSetup(business.id);

  const [localTasks, availability, googleSync, bookingPages] = await Promise.all([
    listCalendarTasksForBusiness(business.id).catch(() => []),
    getCalendarAvailabilityPageData(business.id).catch(() => ({
      slots: [],
      timeZone: bookingSetup?.bookingTimezone ?? "UTC",
    })),
    googleConnected
      ? syncGoogleCalendarEventsForBusiness(business.id).catch(() => ({
          synced: 0,
        }))
      : Promise.resolve({ synced: 0 }),
    listBookingPagesForBusiness(business.id).catch(() => []),
  ]);

  const localEvents = await listCalendarEventsForBusiness(business.id).catch(() => []);

  const events = mergeCalendarEvents({
    localEvents,
    localTasks,
    googleEvents: [],
  });

  return (
    <>
      <CalendarNotificationsMarkRead />
      <OrzuxCalendar
        events={events}
        slots={availability.slots}
        timeZone={availability.timeZone}
        bookingSetup={bookingSetup}
        bookingPages={bookingPages}
        syncError={"syncError" in googleSync ? googleSync.syncError : undefined}
        calendarLabel={connection?.calendarSummary}
        accountEmail={connection?.googleAccountEmail}
        googleConnected={googleConnected}
      />
    </>
  );
}
