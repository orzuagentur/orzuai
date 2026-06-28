"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import { formatEventDateTimeRange, formatSingleDateTime, toLocalDateTimeValue } from "./utils";

function parseBookingGuests(event: OrzuxCalendarEvent): Array<{ name: string; email?: string }> {
  const fromDescription = (event.description ?? "")
    .split("\n")
    .map((line) => line.match(/^Guest \d+: (.+?) <([^>]+)>$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      name: match[1]?.trim() ?? "",
      email: match[2]?.trim(),
    }))
    .filter((guest) => guest.name);

  if (fromDescription.length > 0) {
    return fromDescription;
  }

  return (event.customerName ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      name,
      email: index === 0 ? event.customerEmail ?? undefined : undefined,
    }));
}

type CalendarResourceOption = {
  id: string;
  name: string;
  durationMinutes: number;
};

type OrzuxCalendarEventSheetProps = {
  event: OrzuxCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resources?: CalendarResourceOption[];
  timeZone: string;
};

export function OrzuxCalendarEventSheet({
  event,
  open,
  onOpenChange,
  resources = [],
  timeZone,
}: OrzuxCalendarEventSheetProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [resourceId, setResourceId] = useState<string>("");

  useEffect(() => {
    if (!event || !open) return;

    setTitle(event.summary);
    setDescription(event.description ?? "");
    setStart(toLocalDateTimeValue(new Date(event.start)));
    setEnd(toLocalDateTimeValue(new Date(event.end)));
    setResourceId(event.resourceId ?? "");
    setEditing(false);
  }, [event, open]);

  const isLocal = event?.source === "local" && !event.id.startsWith("google-");
  const canEdit = isLocal && event?.kind !== "task";

  async function handleSave() {
    if (!event || !canEdit) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startDateTime: new Date(start).toISOString(),
          endDateTime: new Date(end).toISOString(),
          timeZone,
          resourceId: resourceId || null,
        }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.eventUpdateFailed);
        return;
      }

      toast.success(ORZUX_CALENDAR_MESSAGES.eventUpdated);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.eventUpdateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || !canEdit) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.recordId}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.eventDeleteFailed);
        return;
      }

      toast.success(ORZUX_CALENDAR_MESSAGES.eventDeleted);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.eventDeleteFailed);
    } finally {
      setIsSaving(false);
    }
  }

  if (!event) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTitle("");
          setEditing(false);
        }
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="pr-8 text-left text-lg leading-snug">
              {editing ? ORZUX_CALENDAR_MESSAGES.editEvent : event.summary}
            </SheetTitle>
            {canEdit && !editing ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setEditing(true)}
                aria-label={ORZUX_CALENDAR_MESSAGES.editEvent}
              >
                <PencilIcon className="size-4" />
              </Button>
            ) : null}
          </div>
          {!editing ? (
            <p className="text-sm text-muted-foreground">
              {formatEventDateTimeRange(event.start, event.end)}
            </p>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-edit-title">{ORZUX_CALENDAR_MESSAGES.eventTitle}</Label>
                <Input
                  id="event-edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-edit-description">
                  {ORZUX_CALENDAR_MESSAGES.eventDescription}
                </Label>
                <textarea
                  id="event-edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              {event.isBooking && resources.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="event-edit-resource">{ORZUX_CALENDAR_MESSAGES.resourceType}</Label>
                  <select
                    id="event-edit-resource"
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {resources.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="event-edit-start">{ORZUX_CALENDAR_MESSAGES.eventStart}</Label>
                <Input
                  id="event-edit-start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-edit-end">{ORZUX_CALENDAR_MESSAGES.eventEnd}</Label>
                <Input
                  id="event-edit-end"
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {event.isBooking ? (
                <div className="rounded-lg border bg-emerald-500/5 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                  {ORZUX_CALENDAR_MESSAGES.bookingBadge}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.eventStart}
                  </p>
                  <p className="mt-1">{formatSingleDateTime(event.start)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.eventEnd}
                  </p>
                  <p className="mt-1">{formatSingleDateTime(event.end)}</p>
                </div>
              </div>
              {event.resourceName ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.resourceType}
                  </p>
                  <p className="mt-1">{event.resourceName}</p>
                </div>
              ) : null}
              {event.customerName ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.guestsLabel}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {parseBookingGuests(event).map((guest) => (
                      <li key={`${guest.name}-${guest.email ?? ""}`}>
                        <span>{guest.name}</span>
                        {guest.email ? (
                          <span className="text-muted-foreground"> · {guest.email}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {event.description ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.eventDescription}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{event.description}</p>
                </div>
              ) : null}
              {event.location ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.eventLocation}
                  </p>
                  <p className="mt-1">{event.location}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          {editing ? (
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                {ORZUX_CALENDAR_MESSAGES.cancel}
              </Button>
              <Button className="flex-1" disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {ORZUX_CALENDAR_MESSAGES.save}
              </Button>
            </div>
          ) : canEdit ? (
            <div className="flex w-full flex-col gap-2">
              {event.isBooking ? (
                <Button variant="secondary" className="w-full" disabled>
                  {ORZUX_CALENDAR_MESSAGES.markBooking}
                </Button>
              ) : null}
              <Button
                variant="destructive"
                className="w-full"
                disabled={isSaving}
                onClick={() => void handleDelete()}
              >
                {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                <Trash2Icon className="size-4" />
                {ORZUX_CALENDAR_MESSAGES.deleteEvent}
              </Button>
            </div>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
