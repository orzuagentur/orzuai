"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, PlusIcon, RefreshCwIcon } from "lucide-react";
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
import { createCalendarEventAction } from "@/features/google-calendar/actions/create-event";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalDateTimeValue(d);
}

function defaultEnd(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalDateTimeValue(d);
}

export function GoogleCalendarToolbar() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  async function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Enter a title.");
      return;
    }

    setIsSaving(true);

    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await createCalendarEventAction({
        summary: title.trim(),
        startDateTime: new Date(start).toISOString(),
        endDateTime: new Date(end).toISOString(),
        timeZone,
      });

      if (!result.success) {
        toast.error(result.message ?? GOOGLE_CALENDAR_MESSAGES.eventCreateFailed);
        return;
      }

      toast.success(GOOGLE_CALENDAR_MESSAGES.eventCreated);
      setDialogOpen(false);
      setTitle("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4" />
          {GOOGLE_CALENDAR_MESSAGES.createEvent}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={() => {
            void handleRefresh();
          }}
        >
          {isRefreshing ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          {GOOGLE_CALENDAR_MESSAGES.refresh}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {GOOGLE_CALENDAR_MESSAGES.openGoogleCalendar}
          </a>
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{GOOGLE_CALENDAR_MESSAGES.createEventTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-title">{GOOGLE_CALENDAR_MESSAGES.eventTitleLabel}</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting with client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-start">{GOOGLE_CALENDAR_MESSAGES.eventStartLabel}</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">{GOOGLE_CALENDAR_MESSAGES.eventEndLabel}</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => void handleCreate()}>
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {GOOGLE_CALENDAR_MESSAGES.createEvent}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
