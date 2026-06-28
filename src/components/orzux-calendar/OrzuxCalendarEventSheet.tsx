"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { extractBookingGuests } from "@/lib/calendar/booking-guests";
import { cn } from "@/lib/utils";
import type { OrzuxCalendarEvent } from "@/types/calendar-events.types";

import { formatEventDateTimeRange, formatDueDate, formatSingleDateTime, toLocalDateTimeValue } from "./utils";

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
  onTaskStatusChange?: (event: OrzuxCalendarEvent, status: "open" | "done") => void;
  onTaskDelete?: (event: OrzuxCalendarEvent) => void;
  updatingTaskId?: string | null;
};

export function OrzuxCalendarEventSheet({
  event,
  open,
  onOpenChange,
  resources = [],
  timeZone,
  onTaskStatusChange,
  onTaskDelete,
  updatingTaskId = null,
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

  const isStoredEvent = event?.id.startsWith("local-event-") ?? false;
  const canEdit = isStoredEvent && event?.kind !== "task";
  const guests = event
    ? extractBookingGuests({
        description: event.description,
        customerName: event.customerName,
        customerEmail: event.customerEmail,
      })
    : [];

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

      toast.success(
        event.isBooking && guests.length > 0
          ? ORZUX_CALENDAR_MESSAGES.bookingUpdatedGuestsNotified
          : ORZUX_CALENDAR_MESSAGES.eventUpdated,
      );
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(ORZUX_CALENDAR_MESSAGES.eventUpdateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(notifyGuests: boolean) {
    if (!event || !canEdit) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.recordId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyGuests }),
      });

      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.eventDeleteFailed);
        return;
      }

      toast.success(
        event.isBooking && notifyGuests && guests.length > 0
          ? ORZUX_CALENDAR_MESSAGES.bookingCancelledGuestsNotified
          : ORZUX_CALENDAR_MESSAGES.eventDeleted,
      );
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

  const editLabel = event.isBooking
    ? ORZUX_CALENDAR_MESSAGES.editBooking
    : ORZUX_CALENDAR_MESSAGES.editEvent;

  const isDoneTask = event.kind === "task" && event.taskStatus === "done";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTitle("");
          setEditing(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,760px)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-0 border-b px-5 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-left text-lg leading-snug">
                <span className={cn(isDoneTask && "line-through decoration-amber-700/60")}>
                  {editing ? editLabel : event.summary}
                </span>
              </DialogTitle>
              {!editing ? (
                <p className="text-sm text-muted-foreground">
                  {formatEventDateTimeRange(event.start, event.end)}
                </p>
              ) : null}
            </div>
            {canEdit && !editing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setEditing(true)}
              >
                <PencilIcon className="size-4" />
                {editLabel}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              {event.isBooking && guests.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {ORZUX_CALENDAR_MESSAGES.bookingUpdateGuestsNotified}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {event.kind === "task" ? (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    isDoneTask
                      ? "border-amber-500/25 bg-amber-500/5 text-amber-800/70 line-through dark:text-amber-200/70"
                      : "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200",
                  )}
                >
                  {isDoneTask
                    ? ORZUX_CALENDAR_MESSAGES.taskCompletedLabel
                    : ORZUX_CALENDAR_MESSAGES.createTask}
                </div>
              ) : null}
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
              {event.kind === "task" && event.dueAt ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.taskDueDate}
                  </p>
                  <p className="mt-1">{formatDueDate(event.dueAt)}</p>
                </div>
              ) : null}
              {event.resourceName ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.resourceType}
                  </p>
                  <p className="mt-1">{event.resourceName}</p>
                </div>
              ) : null}
              {guests.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ORZUX_CALENDAR_MESSAGES.guestsLabel}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {guests.map((guest) => (
                      <li key={`${guest.name}-${guest.email}`}>
                        <span>{guest.name}</span>
                        <span className="text-muted-foreground"> · {guest.email}</span>
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

        <DialogFooter className="shrink-0 border-t px-5 py-4 sm:px-6">
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
          ) : event.isBooking && canEdit ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={isSaving}
                onClick={() => void handleDelete(true)}
              >
                {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {ORZUX_CALENDAR_MESSAGES.cancelBooking}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {ORZUX_CALENDAR_MESSAGES.cancelBookingHint}
              </p>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isSaving}
                onClick={() => void handleDelete(false)}
              >
                {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                <Trash2Icon className="size-4" />
                {ORZUX_CALENDAR_MESSAGES.deleteEvent}
              </Button>
            </div>
          ) : canEdit ? (
            <Button
              variant="destructive"
              className="w-full"
              disabled={isSaving}
              onClick={() => void handleDelete(false)}
            >
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              <Trash2Icon className="size-4" />
              {ORZUX_CALENDAR_MESSAGES.deleteEvent}
            </Button>
          ) : event.kind === "task" ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full"
                variant={isDoneTask ? "outline" : "default"}
                disabled={updatingTaskId === event.recordId}
                onClick={() =>
                  onTaskStatusChange?.(event, isDoneTask ? "open" : "done")
                }
              >
                {updatingTaskId === event.recordId ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {isDoneTask
                  ? ORZUX_CALENDAR_MESSAGES.taskMarkUndone
                  : ORZUX_CALENDAR_MESSAGES.taskMarkDone}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={updatingTaskId === event.recordId}
                onClick={() => onTaskDelete?.(event)}
              >
                {updatingTaskId === event.recordId ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                <Trash2Icon className="size-4" />
                {ORZUX_CALENDAR_MESSAGES.deleteTask}
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
