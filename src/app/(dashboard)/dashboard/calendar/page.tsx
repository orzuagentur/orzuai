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
  listCalendarBookingsForBusiness,
  listCalendarEventsForBusiness,
  listCalendarTasksForBusiness,
  mergeCalendarEvents,
} from "@/services/calendar-events.service";
import { getCalendarAvailabilityPageData } from "@/services/calendar-availability.service";
import { listAllBusinessCalendarResources } from "@/services/business-calendar-resources.service";
import { getGoogleCalendarConnection } from "@/services/google-calendar.service";

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

  const [bookings, localEvents, localTasks, availability, bookingPages, resources] =
    await Promise.all([
      listCalendarBookingsForBusiness(business.id).catch(() => []),
      listCalendarEventsForBusiness(business.id).catch(() => []),
      listCalendarTasksForBusiness(business.id).catch(() => []),
      getCalendarAvailabilityPageData(business.id).catch(() => ({
        slots: [],
        timeZone: bookingSetup?.bookingTimezone ?? "UTC",
      })),
      listBookingPagesForBusiness(business.id).catch(() => []),
      listAllBusinessCalendarResources(business.id).catch(() => []),
    ]);

  const resourceNameMap = Object.fromEntries(resources.map((resource) => [resource.id, resource.name]));

  const nonBookingEvents = localEvents.filter((record) => !record.isBooking);
  const bookingEvents = mergeCalendarEvents({
    localEvents: bookings,
    localTasks: [],
    googleEvents: [],
  });
  const otherEvents = mergeCalendarEvents({
    localEvents: nonBookingEvents,
    localTasks,
    googleEvents: [],
  });

  const events = [...bookingEvents, ...otherEvents]
    .map((event) => {
      if (!event.resourceId || event.resourceName) {
        return event;
      }

      return {
        ...event,
        resourceName: resourceNameMap[event.resourceId] ?? null,
      };
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <>
      <CalendarNotificationsMarkRead />
      <OrzuxCalendar
        events={events}
        slots={availability.slots}
        timeZone={availability.timeZone}
        bookingSetup={bookingSetup}
        bookingPages={bookingPages}
        resources={resources.map((resource) => ({
          id: resource.id,
          name: resource.name,
          resourceType: resource.resourceType,
          durationMinutes: resource.durationMinutes,
        }))}
        calendarLabel={connection?.calendarSummary}
        accountEmail={connection?.googleAccountEmail}
        googleConnected={googleConnected}
      />
    </>
  );
}
