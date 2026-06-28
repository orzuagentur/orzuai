"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { XIcon } from "lucide-react";
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
}: OrzuxCalendarProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openTimesExpanded, setOpenTimesExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OrzuxCalendarEvent | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const [slotTime, setSlotTime] = useState<Date | null>(null);
  const [bookingInitialStart, setBookingInitialStart] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskInitialStart, setTaskInitialStart] = useState<Date | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const openTaskDialog = useCallback((open: boolean) => {
    setTaskDialogOpen(open);
    if (!open) {
      setTaskInitialStart(null);
    }
  }, []);

  const handleTaskComplete = useCallback(
    async (event: OrzuxCalendarEvent) => {
      if (!event.isTask || completingTaskId) {
        return;
      }

      setCompletingTaskId(event.recordId);

      try {
        const response = await fetch(`/api/calendar/tasks/${event.recordId}`, {
          method: "PATCH",
        });
        const result = (await response.json()) as { success: boolean; message?: string };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.taskCompleteFailed);
          return;
        }

        toast.success(ORZUX_CALENDAR_MESSAGES.taskCompleted);
        if (selectedEvent?.recordId === event.recordId) {
          setEventSheetOpen(false);
          setSelectedEvent(null);
        }
        router.refresh();
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.taskCompleteFailed);
      } finally {
        setCompletingTaskId(null);
      }
    },
    [completingTaskId, router, selectedEvent?.recordId],
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [router]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
      syncError,
      isRefreshing,
      onRefresh: () => void handleRefresh(),
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
      syncError,
      isRefreshing,
      handleRefresh,
      sidebarOpen,
      openSidebar,
    ],
  );

  useCalendarChromeRegistration(chromeConfig);

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      {syncError ? (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive md:px-6">
          {syncError}.{" "}
          <Link href={GOOGLE_CALENDAR_INTEGRATION_HREF} className="underline">
            Reconnect
          </Link>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
            onTaskComplete={(event) => void handleTaskComplete(event)}
            completingTaskId={completingTaskId}
          />

          <div className="pointer-events-none absolute bottom-6 right-6 z-30">
            <div className="pointer-events-auto">
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
            </div>
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
        onTaskComplete={(event) => void handleTaskComplete(event)}
        completingTaskId={completingTaskId}
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
