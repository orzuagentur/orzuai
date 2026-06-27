"use client";

import { useTransition } from "react";
import { ChevronDownIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBookingSettingsAction } from "@/features/google-calendar/actions/save-booking-settings";
import { GOOGLE_CALENDAR_MESSAGES } from "@/features/google-calendar/constants";
import type { BusinessBookingSetup } from "@/types/business-calendar-resource.types";

type CalendarBookingSettingsPanelProps = {
  setup: BusinessBookingSetup | null;
};

export function CalendarBookingSettingsPanel({
  setup,
}: CalendarBookingSettingsPanelProps) {
  const [isSaving, startSaving] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startSaving(async () => {
      const result = await saveBookingSettingsAction({
        bookingTimezone: String(form.get("bookingTimezone") ?? "UTC"),
        slotBufferMinutes: Number(form.get("slotBufferMinutes") ?? 15),
        advanceBookingDays: Number(form.get("advanceBookingDays") ?? 14),
        businessHoursEnabled: form.get("businessHoursEnabled") === "on",
        businessHoursStart: String(form.get("businessHoursStart") ?? "09:00"),
        businessHoursEnd: String(form.get("businessHoursEnd") ?? "18:00"),
      });

      if (!result.success) {
        toast.error(result.message ?? GOOGLE_CALENDAR_MESSAGES.settingsSaveFailed);
        return;
      }

      toast.success(GOOGLE_CALENDAR_MESSAGES.settingsSaved);
    });
  }

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>{GOOGLE_CALENDAR_MESSAGES.settingsTitle}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 pb-4 pt-3">
        <p className="mb-4 text-xs text-muted-foreground">
          {GOOGLE_CALENDAR_MESSAGES.settingsDescription}
        </p>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="bookingTimezone" className="text-xs">
              {GOOGLE_CALENDAR_MESSAGES.timezoneLabel}
            </Label>
            <Input
              id="bookingTimezone"
              name="bookingTimezone"
              defaultValue={setup?.bookingTimezone ?? "UTC"}
              placeholder="Europe/Kyiv"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="slotBufferMinutes" className="text-xs">
                {GOOGLE_CALENDAR_MESSAGES.bufferLabel}
              </Label>
              <Input
                id="slotBufferMinutes"
                name="slotBufferMinutes"
                type="number"
                min={0}
                max={120}
                defaultValue={setup?.slotBufferMinutes ?? 15}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="advanceBookingDays" className="text-xs">
                {GOOGLE_CALENDAR_MESSAGES.advanceDaysLabel}
              </Label>
              <Input
                id="advanceBookingDays"
                name="advanceBookingDays"
                type="number"
                min={1}
                max={90}
                defaultValue={setup?.advanceBookingDays ?? 14}
                className="h-9"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 rounded-md border px-3 py-2">
            <input
              name="businessHoursEnabled"
              type="checkbox"
              defaultChecked={setup?.businessHoursEnabled ?? false}
              className="mt-0.5 size-4 rounded border"
            />
            <span className="text-xs leading-relaxed">
              <span className="font-medium">{GOOGLE_CALENDAR_MESSAGES.hoursEnabledLabel}</span>
              <span className="mt-0.5 block text-muted-foreground">
                {GOOGLE_CALENDAR_MESSAGES.hoursEnabledHint}
              </span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="businessHoursStart" className="text-xs">
                {GOOGLE_CALENDAR_MESSAGES.hoursStartLabel}
              </Label>
              <Input
                id="businessHoursStart"
                name="businessHoursStart"
                type="time"
                defaultValue={setup?.businessHoursStart ?? "09:00"}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessHoursEnd" className="text-xs">
                {GOOGLE_CALENDAR_MESSAGES.hoursEndLabel}
              </Label>
              <Input
                id="businessHoursEnd"
                name="businessHoursEnd"
                type="time"
                defaultValue={setup?.businessHoursEnd ?? "18:00"}
                className="h-9"
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={isSaving} className="w-full">
            {isSaving ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            {GOOGLE_CALENDAR_MESSAGES.settingsSave}
          </Button>
        </form>
      </div>
    </details>
  );
}
