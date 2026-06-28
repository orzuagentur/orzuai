"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
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

import { toLocalDateTimeValue } from "./utils";

export type CalendarResourceOption = {
  id: string;
  name: string;
  resourceType: string;
  durationMinutes: number;
};

type OrzuxCalendarBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources: CalendarResourceOption[];
  timeZone: string;
  initialStart?: Date | null;
};

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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState("");

  const selectedResource = resources.find((resource) => resource.id === resourceId);

  useEffect(() => {
    if (!open) return;

    const base = initialStart ? new Date(initialStart) : new Date();
    if (initialStart) {
      base.setMinutes(Math.round(base.getMinutes() / 15) * 15, 0, 0);
    } else {
      base.setHours(9, 0, 0, 0);
    }

    setStart(toLocalDateTimeValue(base));
    setResourceId(resources[0]?.id ?? "");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
  }, [open, initialStart, resources]);

  async function handleSubmit() {
    if (!resourceId || !customerName.trim()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingGuestRequired);
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingEmailRequired);
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (selectedResource?.durationMinutes ?? 60));

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
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingCreateFailed);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ORZUX_CALENDAR_MESSAGES.createBooking}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="booking-resource">{ORZUX_CALENDAR_MESSAGES.resourceType}</Label>
            <select
              id="booking-resource"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                  {resource.durationMinutes ? ` · ${resource.durationMinutes} min` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-start">{ORZUX_CALENDAR_MESSAGES.eventStart}</Label>
            <Input
              id="booking-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-guest">{ORZUX_CALENDAR_MESSAGES.guestLabel} *</Label>
              <Input
                id="booking-guest"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={ORZUX_CALENDAR_MESSAGES.publicBookFirstName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-email">{ORZUX_CALENDAR_MESSAGES.publicBookEmail} *</Label>
              <Input
                id="booking-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
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
          <Button disabled={isSaving} onClick={() => void handleSubmit()}>
            {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {ORZUX_CALENDAR_MESSAGES.publicBookConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
