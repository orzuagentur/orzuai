import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CalendarAvailabilityPanel } from "@/components/google-calendar/CalendarAvailabilityPanel";
import { CalendarBookingSettingsPanel } from "@/components/google-calendar/CalendarBookingSettingsPanel";
import { CalendarNotificationsMarkRead } from "@/components/google-calendar/CalendarNotificationsMarkRead";
import { GoogleCalendarView } from "@/components/google-calendar/GoogleCalendarView";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GOOGLE_CALENDAR_INTEGRATION_HREF, GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getBusinessBookingSetup } from "@/services/business-calendar-setup.service";
import { getCalendarAvailabilityPageData } from "@/services/calendar-availability.service";
import {
  getGoogleCalendarConnection,
  getGoogleCalendarEventsForBusiness,
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
  const bookingSetup = await getBusinessBookingSetup(business.id);

  if (connection?.status !== "connected") {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="mx-auto w-full max-w-lg space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {GOOGLE_CALENDAR_MESSAGES.pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {GOOGLE_CALENDAR_MESSAGES.pageDescription}
          </p>
        </div>
        <Card className="mx-auto w-full max-w-lg shadow-none">
          <CardHeader>
            <CardTitle>{GOOGLE_CALENDAR_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>{GOOGLE_CALENDAR_MESSAGES.connectDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF}>
                {GOOGLE_CALENDAR_MESSAGES.connectButton}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [eventsResult, availability] = await Promise.all([
    getGoogleCalendarEventsForBusiness(business.id),
    getCalendarAvailabilityPageData(business.id),
  ]);

  return (
    <>
      <CalendarNotificationsMarkRead />
      <div className="flex min-h-full flex-col">
        <div className="border-b bg-muted/30 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {GOOGLE_CALENDAR_MESSAGES.pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {connection.calendarSummary ?? GOOGLE_CALENDAR_MESSAGES.calendarLabel}
              {connection.googleAccountEmail
                ? ` · ${connection.googleAccountEmail}`
                : ""}
            </p>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 md:grid-cols-[minmax(0,1fr)_320px] md:p-8">
          <GoogleCalendarView
            events={eventsResult?.events ?? []}
            syncError={eventsResult?.syncError}
          />
          <aside className="space-y-4 md:sticky md:top-6 md:self-start">
            <CalendarAvailabilityPanel
              slots={availability.slots}
              timeZone={availability.timeZone}
            />
            <CalendarBookingSettingsPanel setup={bookingSetup} />
          </aside>
        </div>
      </div>
    </>
  );
}
