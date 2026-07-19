"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, CalendarDaysIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GOOGLE_CALENDAR_INTEGRATION_HREF, GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";
import type { BusinessBookingSetup } from "@/types/business-calendar-resource.types";
import type { BookingPageRecord } from "@/types/booking-page.types";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import {
  useCalendarChromeRegistration,
  type CalendarDayChrome,
} from "./calendar-chrome-context";
import { OrzuxCalendarBookingDialog, type CalendarResourceOption } from "./OrzuxCalendarBookingDialog";
import { OrzuxCalendarBookingPages } from "./OrzuxCalendarBookingPages";
import { OrzuxCalendarCreateMenu } from "./OrzuxCalendarCreateMenu";
import { OrzuxCalendarDayGrid } from "./OrzuxCalendarDayGrid";
import { OrzuxCalendarEventSheet } from "./OrzuxCalendarEventSheet";
import { OrzuxCalendarMiniMonth } from "./OrzuxCalendarMiniMonth";
import { OrzuxCalendarSlotSheet } from "./OrzuxCalendarSlotSheet";
import {
  addDays,
  formatHeaderDate,
  formatTimeRange,
  isSameDay,
  parseDateQueryParam,
  startOfDay,
} from "./utils";

type AvailabilitySlot = {
  label: string;
  start: string;
  end: string;
};

type OrzuxCalendarProps = {
  events: OrzuxCalendarEvent[];
  slots: AvailabilitySlot[];
  timeZone: string;
  bookingSetup: BusinessBookingSetup | null;
  bookingPages?: BookingPageRecord[];
  resources?: CalendarResourceOption[];
  syncError?: string | null;
  calendarLabel?: string | null;
  accountEmail?: string | null;
  googleConnected?: boolean;
  lastSyncedAt?: string | null;
  /** YYYY-MM-DD from ?date= — opens that day in the calendar. */
  initialDate?: string | null;
};

export function OrzuxCalendar({
  events,
  slots,
  timeZone,
  bookingSetup: _bookingSetup,
  bookingPages = [],
  resources = [],
  syncError,
  calendarLabel,
  accountEmail,
  googleConnected = false,
  lastSyncedAt = null,
  initialDate = null,
}: OrzuxCalendarProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSurface, setMobileSurface] = useState<"bookings" | "day">(
    "bookings",
  );
  const [openTimesExpanded, setOpenTimesExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return parseDateQueryParam(initialDate) ?? startOfDay(new Date());
  });
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = parseDateQueryParam(initialDate) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedEvent, setSelectedEvent] = useState<OrzuxCalendarEvent | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const [slotTime, setSlotTime] = useState<Date | null>(null);
  const [bookingInitialStart, setBookingInitialStart] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskInitialStart, setTaskInitialStart] = useState<Date | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseDateQueryParam(initialDate);
    if (!parsed) {
      return;
    }
    setSelectedDate(parsed);
    setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [initialDate]);

  const openTaskDialog = useCallback((open: boolean) => {
    setTaskDialogOpen(open);
    if (!open) {
      setTaskInitialStart(null);
    }
  }, []);

  const handleTaskStatusChange = useCallback(
    async (event: OrzuxCalendarEvent, status: "open" | "done") => {
      if (!event.isTask || updatingTaskId) {
        return;
      }

      setUpdatingTaskId(event.recordId);

      try {
        const response = await fetch(`/api/calendar/tasks/${event.recordId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const result = (await response.json()) as { success: boolean; message?: string };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.taskCompleteFailed);
          return;
        }

        toast.success(
          status === "done"
            ? ORZUX_CALENDAR_MESSAGES.taskCompleted
            : ORZUX_CALENDAR_MESSAGES.taskReopened,
        );
        router.refresh();
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.taskCompleteFailed);
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [updatingTaskId, router],
  );

  const handleTaskDelete = useCallback(
    async (event: OrzuxCalendarEvent) => {
      if (!event.isTask || updatingTaskId) {
        return;
      }

      setUpdatingTaskId(event.recordId);

      try {
        const response = await fetch(`/api/calendar/tasks/${event.recordId}`, {
          method: "DELETE",
        });
        const result = (await response.json()) as { success: boolean; message?: string };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.taskDeleteFailed);
          return;
        }

        toast.success(ORZUX_CALENDAR_MESSAGES.taskDeleted);
        if (selectedEvent?.recordId === event.recordId) {
          setEventSheetOpen(false);
          setSelectedEvent(null);
        }
        router.refresh();
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.taskDeleteFailed);
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [updatingTaskId, router, selectedEvent?.recordId],
  );

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      const start = event.isAllDay
        ? new Date(`${event.start}T12:00:00`)
        : new Date(event.start);
      set.add(startOfDay(start).toDateString());
    }
    return set;
  }, [events]);

  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => isSameDay(new Date(slot.start), selectedDate)),
    [slots, selectedDate],
  );

  const bookingEvents = useMemo(() => {
    return events
      .filter((event) => event.kind === "booking" || event.isBooking)
      .slice()
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [events]);

  const openBooking = useCallback((start: Date | null = null) => {
    setBookingInitialStart(start);
    setBookingOpen(true);
  }, []);

  const goToday = useCallback(() => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, []);

  const goPrevDay = useCallback(() => {
    setSelectedDate((current) => {
      const next = addDays(current, -1);
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDate((current) => {
      const next = addDays(current, 1);
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!googleConnected) {
      return;
    }

    let cancelled = false;

    async function syncGoogleCalendar() {
      try {
        const response = await fetch("/api/calendar/google/sync", { method: "POST" });
        if (!response.ok || cancelled) {
          return;
        }

        router.refresh();
      } catch {
        // Background sync — no toast noise.
      }
    }

    const intervalId = window.setInterval(() => {
      void syncGoogleCalendar();
    }, 120_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [googleConnected, router]);

  const headerDateLabel = formatHeaderDate(selectedDate);

  const chromeConfig = useMemo<CalendarDayChrome>(
    () => ({
      variant: "day",
      pageTitle: GOOGLE_CALENDAR_MESSAGES.pageTitle,
      dateLabel: headerDateLabel,
      onToday: goToday,
      onPrev: goPrevDay,
      onNext: goNextDay,
      googleConnected,
      calendarLabel,
      accountEmail,
      lastSyncedAt,
      syncError,
      sidebarOpen,
      onOpenSidebar: openSidebar,
    }),
    [
      headerDateLabel,
      goToday,
      goPrevDay,
      goNextDay,
      googleConnected,
      calendarLabel,
      accountEmail,
      lastSyncedAt,
      syncError,
      sidebarOpen,
      openSidebar,
    ],
  );

  useCalendarChromeRegistration(chromeConfig);

  const createMenu = (
    <OrzuxCalendarCreateMenu
      selectedDate={selectedDate}
      variant="fab"
      bookingPageCount={bookingPages.length}
      onOpenBooking={() => openBooking()}
      eventOpen={eventDialogOpen}
      onEventOpenChange={setEventDialogOpen}
      taskOpen={taskDialogOpen}
      onTaskOpenChange={openTaskDialog}
      taskInitialStart={taskInitialStart}
      onPrepareTaskOpen={() => setTaskInitialStart(null)}
    />
  );

  return (
    <div className="relative flex dashboard-main-frame flex-col overflow-hidden bg-background">
      {syncError ? (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive md:px-6">
          {syncError}.{" "}
          <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF} className="underline">
            Reconnect
          </Link>
        </div>
      ) : null}

      {/* Mobile: bookings list first, day calendar behind icon */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {mobileSurface === "bookings" ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">Bookings</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {bookingEvents.length} upcoming
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                aria-label={GOOGLE_CALENDAR_MESSAGES.pageTitle}
                onClick={() => setMobileSurface("day")}
              >
                <CalendarDaysIcon className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {bookingEvents.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No bookings yet. Tap + to create one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {bookingEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl border bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventSheetOpen(true);
                        }}
                      >
                        <p className="truncate font-medium">{event.summary}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatTimeRange(event.start, event.end)}
                          {event.customerName
                            ? ` · ${event.customerName}`
                            : null}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-20 right-4 z-30 md:bottom-6">
              <div className="pointer-events-auto">{createMenu}</div>
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMobileSurface("bookings")}
              >
                <ArrowLeftIcon className="size-4" />
                Bookings
              </Button>
              <p className="ml-auto truncate text-sm capitalize text-muted-foreground">
                {headerDateLabel}
              </p>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden p-3">
              <OrzuxCalendarDayGrid
                selectedDate={selectedDate}
                events={events}
                timeZone={timeZone}
                onEventClick={(event) => {
                  setSelectedEvent(event);
                  setEventSheetOpen(true);
                }}
                onSlotClick={(time) => {
                  setSlotTime(time);
                  setSlotSheetOpen(true);
                }}
                onTaskStatusChange={(event, status) =>
                  void handleTaskStatusChange(event, status)
                }
                updatingTaskId={updatingTaskId}
              />
              <div className="pointer-events-none absolute bottom-4 right-4 z-30">
                <div className="pointer-events-auto">{createMenu}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop */}
      <div className="relative hidden min-h-0 flex-1 overflow-hidden md:flex">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          <OrzuxCalendarDayGrid
            selectedDate={selectedDate}
            events={events}
            timeZone={timeZone}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setEventSheetOpen(true);
            }}
            onSlotClick={(time) => {
              setSlotTime(time);
              setSlotSheetOpen(true);
            }}
            onTaskStatusChange={(event, status) => void handleTaskStatusChange(event, status)}
            updatingTaskId={updatingTaskId}
          />

          <div className="pointer-events-none absolute bottom-6 right-6 z-30">
            <div className="pointer-events-auto">{createMenu}</div>
          </div>
        </div>

        <aside
          className={cn(
            "flex shrink-0 flex-col border-l bg-muted/20 transition-[width,opacity] duration-300 ease-in-out",
            sidebarOpen ? "w-[280px] opacity-100" : "w-0 overflow-hidden opacity-0",
          )}
        >
          <div className="flex h-full w-[280px] min-w-[280px] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <OrzuxCalendarCreateMenu
                      selectedDate={selectedDate}
                      variant="sidebar"
                      bookingPageCount={bookingPages.length}
                      onOpenBooking={() => openBooking()}
                      eventOpen={eventDialogOpen}
                      onEventOpenChange={setEventDialogOpen}
                      taskOpen={taskDialogOpen}
                      onTaskOpenChange={openTaskDialog}
                      taskInitialStart={taskInitialStart}
                      onPrepareTaskOpen={() => setTaskInitialStart(null)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label={ORZUX_CALENDAR_MESSAGES.closeSidebar}
                    onClick={closeSidebar}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>

                <OrzuxCalendarBookingPages pages={bookingPages} />

                <OrzuxCalendarMiniMonth
                  selectedDate={selectedDate}
                  visibleMonth={visibleMonth}
                  onSelectDate={setSelectedDate}
                  onVisibleMonthChange={setVisibleMonth}
                  daysWithEvents={daysWithEvents}
                />

                <details
                  className="rounded-xl border bg-card"
                  open={openTimesExpanded}
                  onToggle={(event) =>
                    setOpenTimesExpanded((event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                    {ORZUX_CALENDAR_MESSAGES.openTimes}
                  </summary>
                  <div className="space-y-2 border-t px-3 pb-3 pt-2">
                    <p className="text-xs text-muted-foreground">
                      {ORZUX_CALENDAR_MESSAGES.openTimesHint}
                    </p>
                    {selectedDaySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {ORZUX_CALENDAR_MESSAGES.noOpenTimes}
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {selectedDaySlots.map((slot) => (
                          <li
                            key={slot.start}
                            className="rounded-md border bg-background px-2 py-1.5 text-xs tabular-nums"
                          >
                            {formatTimeRange(slot.start, slot.end)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <OrzuxCalendarEventSheet
        event={selectedEvent}
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        resources={resources}
        timeZone={timeZone}
        onTaskStatusChange={(event, status) => void handleTaskStatusChange(event, status)}
        onTaskDelete={(event) => void handleTaskDelete(event)}
        updatingTaskId={updatingTaskId}
      />

      <OrzuxCalendarBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        resources={resources}
        timeZone={timeZone}
        initialStart={bookingInitialStart}
      />

      <OrzuxCalendarSlotSheet
        open={slotSheetOpen}
        onOpenChange={setSlotSheetOpen}
        slotTime={slotTime}
        onCreateBooking={() => {
          setBookingInitialStart(slotTime);
          setBookingOpen(true);
        }}
        onCreateEvent={() => {
          setEventDialogOpen(true);
        }}
        onCreateTask={() => {
          setTaskInitialStart(slotTime);
          setTaskDialogOpen(true);
        }}
      />
    </div>
  );
}
