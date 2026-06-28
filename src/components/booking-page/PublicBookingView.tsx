"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarIcon, CheckCircle2Icon, ClockIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { PublicBookingCalendar } from "@/components/booking-page/PublicBookingCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import type { BookingFormField } from "@/lib/calendar/booking-form-fields";
import { cn } from "@/lib/utils";
import type { PublicBookingPageView, PublicBookingSlot } from "@/types/booking-page.types";

type ResourceSlotGroup = {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  durationMinutes: number;
  slots: PublicBookingSlot[];
};

type PublicBookingViewProps = {
  page: PublicBookingPageView;
  formFields: BookingFormField[];
  resources: Array<{
    id: string;
    name: string;
    resourceType: string;
    durationMinutes: number;
  }>;
  initialResourceSlots: ResourceSlotGroup[];
  initialDate: string;
};

function getInputType(field: BookingFormField): string {
  if (field.type === "email") return "email";
  if (field.type === "phone") return "tel";
  return "text";
}

function formatSelectedDayLabel(dateKey: string, timeZone: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!, 12, 0, 0);
  return date.toLocaleDateString(undefined, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PublicBookingView({
  page,
  formFields,
  resources,
  initialResourceSlots,
  initialDate,
}: PublicBookingViewProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [resourceSlots, setResourceSlots] = useState(initialResourceSlots);
  const [selectedSlot, setSelectedSlot] = useState<PublicBookingSlot | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState(resources[0]?.id ?? "");
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [isLoadingSlots, startLoadingSlots] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();

  const selectedDayLabel = useMemo(
    () => formatSelectedDayLabel(selectedDate, page.bookingTimezone),
    [selectedDate, page.bookingTimezone],
  );

  const loadSlotsForDate = useCallback(
    (dateKey: string) => {
      startLoadingSlots(async () => {
        try {
          const response = await fetch(
            `/api/public/book/${page.slug}?date=${encodeURIComponent(dateKey)}`,
          );
          const result = (await response.json()) as {
            success: boolean;
            resourceSlots?: ResourceSlotGroup[];
          };

          if (!response.ok || !result.success) {
            toast.error(ORZUX_CALENDAR_MESSAGES.publicBookFailed);
            return;
          }

          setResourceSlots(result.resourceSlots ?? []);
          setSelectedSlot(null);
        } catch {
          toast.error(ORZUX_CALENDAR_MESSAGES.publicBookFailed);
        }
      });
    },
    [page.slug],
  );

  useEffect(() => {
    if (selectedDate !== initialDate) {
      loadSlotsForDate(selectedDate);
    }
  }, [selectedDate, initialDate, loadSlotsForDate]);

  function handleDateSelect(dateKey: string) {
    setSelectedDate(dateKey);
  }

  function updateAnswer(key: string, value: string) {
    setFormAnswers((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit() {
    if (!selectedSlot) {
      toast.error(ORZUX_CALENDAR_MESSAGES.publicBookSelectSlot);
      return;
    }

    for (const field of formFields) {
      if (field.required && !formAnswers[field.key]?.trim()) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }

    startSubmitting(async () => {
      try {
        const response = await fetch(`/api/public/book/${page.slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDateTime: selectedSlot.start,
            endDateTime: selectedSlot.end,
            resourceId: selectedResourceId || undefined,
            formAnswers,
          }),
        });

        const result = (await response.json()) as { success: boolean; message?: string };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.publicBookFailed);
          return;
        }

        setCompleted(true);
        toast.success(ORZUX_CALENDAR_MESSAGES.publicBookSuccess);
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.publicBookFailed);
      }
    });
  }

  if (completed) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <CheckCircle2Icon className="mb-4 size-14 text-primary" />
        <h1 className="text-2xl font-semibold">{ORZUX_CALENDAR_MESSAGES.publicBookSuccess}</h1>
        <p className="mt-2 text-muted-foreground">
          {ORZUX_CALENDAR_MESSAGES.publicBookSuccessHint}
        </p>
        {selectedSlot ? (
          <p className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">{selectedSlot.label}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <header className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {page.businessName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{page.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{page.businessTypeLabel}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <PublicBookingCalendar
              timeZone={page.bookingTimezone}
              weeklySchedule={page.weeklySchedule}
              advanceBookingDays={page.advanceBookingDays}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
            />

            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <ClockIcon className="size-4 text-primary" />
                <h2 className="text-base font-medium">
                  {ORZUX_CALENDAR_MESSAGES.publicBookAvailableTimes}
                </h2>
              </div>
              <p className="mb-1 text-sm font-medium">
                {ORZUX_CALENDAR_MESSAGES.publicBookChooseResource}
              </p>
              <p className="mb-4 text-sm capitalize text-muted-foreground">{selectedDayLabel}</p>

              {isLoadingSlots ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  {ORZUX_CALENDAR_MESSAGES.publicBookLoadingTimes}
                </div>
              ) : resourceSlots.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  {ORZUX_CALENDAR_MESSAGES.publicBookNoTimesForDay}
                </p>
              ) : (
                <div className="space-y-4">
                  {resourceSlots.map((group) => (
                    <div key={group.resourceId} className="rounded-xl border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{group.resourceName}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {group.resourceType.replace("_", " ")} · {group.durationMinutes} min
                          </p>
                        </div>
                      </div>
                      {group.slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {ORZUX_CALENDAR_MESSAGES.publicBookNoTimesForDay}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {group.slots.map((slot) => {
                            const active =
                              selectedSlot?.start === slot.start &&
                              selectedSlot?.end === slot.end &&
                              selectedResourceId === group.resourceId;

                            return (
                              <button
                                key={`${group.resourceId}-${slot.start}`}
                                type="button"
                                className={cn(
                                  "min-w-[5.5rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-background hover:border-primary/40 hover:bg-muted",
                                )}
                                onClick={() => {
                                  setSelectedResourceId(group.resourceId);
                                  setSelectedSlot(slot);
                                }}
                              >
                                {new Date(slot.start).toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  timeZone: page.bookingTimezone,
                                })}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-8 lg:self-start">
            <div className="mb-4 flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" />
              <h2 className="text-base font-medium">{ORZUX_CALENDAR_MESSAGES.publicBookYourDetails}</h2>
            </div>

            <div className="space-y-3">
              {selectedSlot && selectedResourceId ? (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                  {resourceSlots.find((group) => group.resourceId === selectedResourceId)?.resourceName}
                </p>
              ) : null}

              {formFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label htmlFor={`public-field-${field.id}`}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`public-field-${field.id}`}
                      value={formAnswers[field.key] ?? ""}
                      onChange={(event) => updateAnswer(field.key, event.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  ) : (
                    <Input
                      id={`public-field-${field.id}`}
                      type={getInputType(field)}
                      value={formAnswers[field.key] ?? ""}
                      onChange={(event) => updateAnswer(field.key, event.target.value)}
                    />
                  )}
                </div>
              ))}

              {selectedSlot ? (
                <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-foreground">
                  {selectedSlot.label}
                </p>
              ) : (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {ORZUX_CALENDAR_MESSAGES.publicBookSelectSlot}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={isSubmitting || isLoadingSlots || !selectedSlot}
                onClick={handleSubmit}
              >
                {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {ORZUX_CALENDAR_MESSAGES.publicBookConfirm}
              </Button>
            </div>
          </section>
        </div>

        <footer className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            {ORZUX_CALENDAR_MESSAGES.publicBookPoweredBy}
          </p>
          <a
            href={page.publicUrl}
            className="mt-1 inline-block text-[11px] text-muted-foreground hover:text-foreground"
          >
            {page.publicUrl}
          </a>
        </footer>
      </div>
    </div>
  );
}
