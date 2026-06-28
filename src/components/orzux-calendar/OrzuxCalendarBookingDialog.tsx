"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { cn } from "@/lib/utils";

import { toLocalDateTimeValue } from "./utils";

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
      {message}
    </p>
  );
}

export type CalendarResourceOption = {
  id: string;
  name: string;
  resourceType: string;
  durationMinutes: number;
};

type GuestEntry = {
  id: string;
  name: string;
  email: string;
};

type OrzuxCalendarBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: CalendarResourceOption[];
  timeZone: string;
  initialStart?: Date | null;
};

function createGuest(): GuestEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
  };
}

function defaultEndFromStart(startValue: string, durationMinutes: number): string {
  const startDate = new Date(startValue);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return toLocalDateTimeValue(endDate);
}

export function OrzuxCalendarBookingDialog({
  open,
  onOpenChange,
  resources,
  timeZone,
  initialStart,
}: OrzuxCalendarBookingDialogProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");
  const [guests, setGuests] = useState<GuestEntry[]>([createGuest()]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const selectedResource = resources.find((resource) => resource.id === resourceId);
  const durationMinutes = selectedResource?.durationMinutes ?? 60;
  const hasAvailabilityError = Boolean(resourceError || timeError);

  useEffect(() => {
    if (!open) return;

    const base = initialStart ? new Date(initialStart) : new Date();
    if (initialStart) {
      base.setMinutes(Math.round(base.getMinutes() / 15) * 15, 0, 0);
    } else {
      base.setHours(9, 0, 0, 0);
    }

    const startValue = toLocalDateTimeValue(base);
    setStart(startValue);
    setEnd(defaultEndFromStart(startValue, resources[0]?.durationMinutes ?? 60));
    setResourceId(resources[0]?.id ?? "");
    setGuests([createGuest()]);
    setCustomerPhone("");
    setNotes("");
    setResourceError(null);
    setTimeError(null);
    setIsCheckingAvailability(false);
  }, [open, initialStart, resources]);

  useEffect(() => {
    if (!open || !resourceId || !start || !end) {
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setResourceError(null);
      setTimeError(ORZUX_CALENDAR_MESSAGES.endBeforeStart);
      setIsCheckingAvailability(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsCheckingAvailability(true);
      setResourceError(null);
      setTimeError(null);

      void fetch("/api/calendar/bookings/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          timeZone,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = (await response.json()) as {
            success: boolean;
            available?: boolean;
            message?: string;
            field?: "resource" | "time";
          };

          if (!response.ok || !result.success) {
            setTimeError(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingCreateFailed);
            return;
          }

          if (result.available) {
            setResourceError(null);
            setTimeError(null);
            return;
          }

          if (result.field === "resource") {
            setResourceError(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingSlotUnavailable);
            setTimeError(null);
          } else {
            setResourceError(null);
            setTimeError(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingSlotUnavailable);
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setTimeError(ORZUX_CALENDAR_MESSAGES.bookingCreateFailed);
        })
        .finally(() => {
          setIsCheckingAvailability(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, resourceId, start, end, timeZone]);

  function handleStartChange(value: string) {
    setStart(value);
    setEnd(defaultEndFromStart(value, durationMinutes));
    setResourceError(null);
    setTimeError(null);
  }

  function handleResourceChange(value: string) {
    setResourceId(value);
    setResourceError(null);
    setTimeError(null);
    const resource = resources.find((item) => item.id === value);
    if (start) {
      setEnd(defaultEndFromStart(start, resource?.durationMinutes ?? 60));
    }
  }

  function updateGuest(id: string, patch: Partial<Pick<GuestEntry, "name" | "email">>) {
    setGuests((current) =>
      current.map((guest) => (guest.id === id ? { ...guest, ...patch } : guest)),
    );
  }

  function addGuest() {
    setGuests((current) => [...current, createGuest()]);
  }

  function removeGuest(id: string) {
    setGuests((current) => (current.length <= 1 ? current : current.filter((guest) => guest.id !== id)));
  }

  async function handleSubmit() {
    if (!resourceId) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingResourcesRequired);
      return;
    }

    const normalizedGuests = guests
      .map((guest) => ({
        name: guest.name.trim(),
        email: guest.email.trim().toLowerCase(),
      }))
      .filter((guest) => guest.name || guest.email);

    if (normalizedGuests.length === 0 || !normalizedGuests[0]?.name) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingGuestRequired);
      return;
    }

    for (const guest of normalizedGuests) {
      if (!guest.name || !guest.email.includes("@")) {
        toast.error(ORZUX_CALENDAR_MESSAGES.bookingGuestEmailRequired);
        return;
      }
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingInvalidDates);
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.endBeforeStart);
      return;
    }

    if (hasAvailabilityError || isCheckingAvailability) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/calendar/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          timeZone,
          guests: normalizedGuests,
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        const message = result.message ?? ORZUX_CALENDAR_MESSAGES.bookingCreateFailed;
        if (message.includes("already booked") || message.includes("overlaps")) {
          setResourceError(message);
          setTimeError(null);
        } else {
          setTimeError(message);
          setResourceError(null);
        }
        return;
      }

      toast.success(ORZUX_CALENDAR_MESSAGES.bookingCreated);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingCreateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  if (resources.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ORZUX_CALENDAR_MESSAGES.createBooking}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {ORZUX_CALENDAR_MESSAGES.bookingResourcesRequired}
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ORZUX_CALENDAR_MESSAGES.createBooking}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="booking-resource">{ORZUX_CALENDAR_MESSAGES.resourceType}</Label>
            <select
              id="booking-resource"
              value={resourceId}
              onChange={(e) => handleResourceChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                  {resource.durationMinutes ? ` · ${resource.durationMinutes} min` : ""}
                </option>
              ))}
            </select>
            <FieldError message={resourceError} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-start">{ORZUX_CALENDAR_MESSAGES.eventStart}</Label>
              <Input
                id="booking-start"
                type="datetime-local"
                value={start}
                onChange={(e) => handleStartChange(e.target.value)}
                className={cn(timeError ? "border-destructive" : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-end">{ORZUX_CALENDAR_MESSAGES.eventEnd}</Label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setResourceError(null);
                  setTimeError(null);
                }}
                className={cn(timeError ? "border-destructive" : undefined)}
              />
            </div>
          </div>
          {isCheckingAvailability ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              {ORZUX_CALENDAR_MESSAGES.bookingCheckingAvailability}
            </p>
          ) : null}
          <FieldError message={timeError} />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>{ORZUX_CALENDAR_MESSAGES.guestsLabel}</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addGuest}>
                <PlusIcon className="size-3.5" />
                {ORZUX_CALENDAR_MESSAGES.addGuest}
              </Button>
            </div>

            <div className="space-y-2">
              {guests.map((guest, index) => (
                <div key={guest.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {ORZUX_CALENDAR_MESSAGES.guestLabel} {index + 1}
                    </p>
                    {guests.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={ORZUX_CALENDAR_MESSAGES.removeGuest}
                        onClick={() => removeGuest(guest.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={guest.name}
                      onChange={(e) => updateGuest(guest.id, { name: e.target.value })}
                      placeholder={ORZUX_CALENDAR_MESSAGES.publicBookFirstName}
                    />
                    <Input
                      type="email"
                      value={guest.email}
                      onChange={(e) => updateGuest(guest.id, { email: e.target.value })}
                      placeholder={ORZUX_CALENDAR_MESSAGES.publicBookEmail}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-phone">{ORZUX_CALENDAR_MESSAGES.publicBookPhone}</Label>
            <Input
              id="booking-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-notes">{ORZUX_CALENDAR_MESSAGES.publicBookNotes}</Label>
            <textarea
              id="booking-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ORZUX_CALENDAR_MESSAGES.cancel}
          </Button>
          <Button
            disabled={isSaving || isCheckingAvailability || hasAvailabilityError}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {ORZUX_CALENDAR_MESSAGES.publicBookConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
