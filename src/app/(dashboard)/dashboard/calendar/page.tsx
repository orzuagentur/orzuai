import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
import { GOOGLE_CALENDAR_INTEGRATION_HREF } from "@/features/google-calendar/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
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

  if (connection?.status !== "connected") {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>Connect Google Calendar</CardTitle>
            <CardDescription>
              Connect your Google account to view events and enable AI booking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF}>
                Connect Google Calendar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventsResult = await getGoogleCalendarEventsForBusiness(business.id);

  return (
    <GoogleCalendarView
      events={eventsResult?.events ?? []}
      calendarSummary={connection.calendarSummary}
      googleAccountEmail={connection.googleAccountEmail}
      syncError={eventsResult?.syncError}
    />
  );
}
