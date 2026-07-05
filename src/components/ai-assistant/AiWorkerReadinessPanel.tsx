"use client";

import Link from "next/link";
import { CalendarCheckIcon, CheckCircle2Icon, CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { AiWorkerReadiness } from "@/types/ai-worker-readiness.types";

type AiWorkerReadinessPanelProps = {
  readiness: AiWorkerReadiness;
  summarizeActionsEnabled: boolean;
};

type ReadinessItem = {
  label: string;
  ready: boolean;
  hint: string;
};

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const Icon = item.ready ? CheckCircle2Icon : CircleAlertIcon;

  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          item.ready ? "text-emerald-600" : "text-amber-600",
        )}
      />
      <div>
        <p className="font-medium">{item.label}</p>
        <p className="text-muted-foreground">{item.hint}</p>
      </div>
    </div>
  );
}

export function AiWorkerReadinessPanel({
  readiness,
  summarizeActionsEnabled,
}: AiWorkerReadinessPanelProps) {
  const bookingReady =
    readiness.calendarBookingEnabled &&
    (readiness.resourceCount > 0 || readiness.bookingPageCount > 0);

  const items: ReadinessItem[] = [
    {
      label: "Instant booking",
      ready: bookingReady,
      hint: bookingReady
        ? `${readiness.resourceCount} resource(s), ${readiness.bookingPageCount} booking page(s)`
        : "Add calendar resources or a booking page so the agent can confirm appointments.",
    },
    {
      label: "Booking confirmations in chat",
      ready: summarizeActionsEnabled,
      hint: summarizeActionsEnabled
        ? "Customers receive follow-up messages after bookings and CRM actions."
        : "Enable “Summarize actions in chat” in agent settings.",
    },
    {
      label: "Google Calendar sync",
      ready: readiness.googleCalendarConnected,
      hint: readiness.googleCalendarConnected
        ? "Busy times from Google are included in availability."
        : "Optional — connect Google Calendar to avoid double bookings.",
    },
  ];

  const readyCount = items.filter((item) => item.ready).length;

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheckIcon className="size-4 text-emerald-600" />
              Worker readiness
            </CardTitle>
            <CardDescription className="mt-1">
              {readyCount}/{items.length} checks passed — the agent works best when
              booking and confirmations are fully configured.
            </CardDescription>
          </div>
          {!bookingReady ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.calendarBooking}>Set up booking</Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {items.map((item) => (
          <ReadinessRow key={item.label} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}
