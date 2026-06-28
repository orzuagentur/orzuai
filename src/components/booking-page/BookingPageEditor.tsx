"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  CopyIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { BookingFormFieldsEditor } from "@/components/booking-page/BookingFormFieldsEditor";
import {
  BookingResourcesEditor,
  createResourcesFromPreset,
  mapResourcesToEditable,
  type EditableBookingResource,
} from "@/components/booking-page/BookingResourcesEditor";
import { BusinessTypePresetPicker } from "@/components/booking-page/BusinessTypePresetPicker";
import { BookingPageWeekPreview } from "@/components/booking-page/BookingPageWeekPreview";
import {
  useCalendarChromeRegistration,
  type CalendarBookingChrome,
} from "@/components/orzux-calendar/calendar-chrome-context";
import { addDays, startOfDay } from "@/components/orzux-calendar/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezonePicker } from "@/components/ui/TimezonePicker";
import { DASHBOARD_ROUTES, PUBLIC_ROUTES } from "@/constants/routes";
import { getPublicAppOrigin } from "@/constants/public-app-url";
import { ORZUX_CALENDAR_MESSAGES } from "@/features/google-calendar/orzux-calendar-messages";
import { slugifyBookingPageTitle } from "@/lib/calendar/booking-page-slug";
import {
  DEFAULT_BOOKING_FORM_FIELDS,
  parseBookingFormFields,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";
import {
  formatTime12h,
  buildWeeklyScheduleFromSetup,
  getWeeklyScheduleFieldErrors,
  validateWeeklySchedule,
  WEEKDAY_LABELS,
  type WeeklySchedule,
} from "@/lib/calendar/weekly-schedule";
import {
  getBusinessTypePreset,
  getDurationOptionsForType,
} from "@/lib/calendar/business-type-presets";
import type { BookingPageRecord } from "@/types/booking-page.types";

import type {
  BusinessBookingSetup,
  BusinessBookingType,
  BusinessCalendarResource,
} from "@/types/business-calendar-resource.types";

type BookingEditorStep = 1 | 2 | 3;

type BookingPageEditorProps = {
  setup: BusinessBookingSetup | null;
  page: BookingPageRecord | null;
  resources: BusinessCalendarResource[];
};

function canProceedFromStep(
  step: BookingEditorStep,
  title: string,
  schedule: WeeklySchedule,
  resources: EditableBookingResource[],
): boolean {
  if (step === 1) {
    const scheduleValidation = validateWeeklySchedule(schedule);
    const hasResources = resources.some((resource) => resource.name.trim());
    return scheduleValidation.valid && hasResources;
  }

  if (step === 2) {
    return title.trim().length > 0;
  }

  return true;
}

function getWeekStart(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function serializeWeeklySchedule(schedule: WeeklySchedule) {
  return Object.fromEntries(
    Object.entries(schedule).map(([day, value]) => [String(day), value]),
  );
}

function serializeResources(resources: EditableBookingResource[]) {
  return resources
    .filter((resource) => resource.name.trim())
    .map((resource) => ({
      id: resource.id,
      resourceType: resource.resourceType,
      name: resource.name.trim(),
      description: resource.description.trim(),
      capacity: resource.capacity,
      durationMinutes: resource.durationMinutes,
      active: true,
    }));
}

export function BookingPageEditor({
  setup,
  page,
  resources: initialResources,
}: BookingPageEditorProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const initialType = page?.businessType ?? setup?.businessType ?? "generic";
  const initialPreset = getBusinessTypePreset(initialType);

  const [businessType, setBusinessType] = useState<BusinessBookingType>(initialType);
  const [title, setTitle] = useState(
    page?.title || setup?.bookingPageTitle || initialPreset.defaultPageTitle,
  );
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [published, setPublished] = useState(page?.published ?? false);
  const [duration, setDuration] = useState(
    page?.slotDurationMinutes ?? setup?.slotDurationMinutes ?? initialPreset.slotDurationMinutes,
  );
  const [bufferMinutes, setBufferMinutes] = useState(
    page?.slotBufferMinutes ?? setup?.slotBufferMinutes ?? initialPreset.slotBufferMinutes,
  );
  const [advanceDays, setAdvanceDays] = useState(
    page?.advanceBookingDays ?? setup?.advanceBookingDays ?? initialPreset.advanceBookingDays,
  );
  const [timeZone, setTimeZone] = useState(
    page?.bookingTimezone ??
      setup?.bookingTimezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    page?.weeklySchedule ??
      (setup ? buildWeeklyScheduleFromSetup(setup) : initialPreset.weeklySchedule),
  );
  const [resources, setResources] = useState<EditableBookingResource[]>(() =>
    initialResources.length > 0
      ? mapResourcesToEditable(initialResources)
      : createResourcesFromPreset(initialPreset.resources),
  );
  const [formFields, setFormFields] = useState<BookingFormField[]>(() =>
    page?.formFields?.length
      ? parseBookingFormFields(page.formFields)
      : DEFAULT_BOOKING_FORM_FIELDS,
  );
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [fieldErrors, setFieldErrors] = useState<
    Record<number, { start?: string; end?: string }>
  >({});
  const [editorStep, setEditorStep] = useState<BookingEditorStep>(1);

  const durationOptions = useMemo(
    () => getDurationOptionsForType(businessType),
    [businessType],
  );

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
  }, [weekStart]);

  const goToday = useCallback(() => {
    setWeekStart(getWeekStart(new Date()));
  }, []);

  const goPrevWeek = useCallback(() => {
    setWeekStart((current) => addDays(current, -7));
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((current) => addDays(current, 7));
  }, []);

  const chromeConfig = useMemo<CalendarBookingChrome>(
    () => ({
      variant: "booking",
      title: ORZUX_CALENDAR_MESSAGES.bookingPageTitle,
      weekLabel,
      onToday: goToday,
      onPrev: goPrevWeek,
      onNext: goNextWeek,
    }),
    [weekLabel, goToday, goPrevWeek, goNextWeek],
  );

  useCalendarChromeRegistration(chromeConfig);

  function applyPreset(type: BusinessBookingType, silent = false) {
    const preset = getBusinessTypePreset(type);

    setBusinessType(type);
    setTitle((current) => current.trim() || preset.defaultPageTitle);
    setDuration(preset.slotDurationMinutes);
    setBufferMinutes(preset.slotBufferMinutes);
    setAdvanceDays(preset.advanceBookingDays);
    setSchedule(preset.weeklySchedule);
    setResources(createResourcesFromPreset(preset.resources));
    setFieldErrors({});
    if (!silent) {
      toast.success(ORZUX_CALENDAR_MESSAGES.presetApplied);
    }
  }

  function updateDay(day: number, patch: Partial<WeeklySchedule[number]>) {
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day]!, ...patch },
    }));
    setFieldErrors(getWeeklyScheduleFieldErrors({
      ...schedule,
      [day]: { ...schedule[day]!, ...patch },
    }));
  }

  function toggleDay(day: number) {
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day]!, enabled: !current[day]!.enabled },
    }));
  }

  function copyHoursToAll(sourceDay: number) {
    const source = schedule[sourceDay];

    if (!source) return;

    setSchedule((current) => {
      const next = { ...current };

      for (let day = 0; day <= 6; day += 1) {
        if (next[day]?.enabled) {
          next[day] = {
            ...next[day]!,
            start: source.start,
            end: source.end,
          };
        }
      }

      return next;
    });
  }

  function handleSave(publish: boolean) {
    if (!title.trim()) {
      toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageTitleRequired);
      return;
    }

    const scheduleValidation = validateWeeklySchedule(schedule);
    const nextFieldErrors = getWeeklyScheduleFieldErrors(schedule);
    setFieldErrors(nextFieldErrors);

    if (!scheduleValidation.valid) {
      return;
    }

    const serializedResources = serializeResources(resources);

    if (serializedResources.length === 0) {
      toast.error(ORZUX_CALENDAR_MESSAGES.resourcesTitle);
      return;
    }

    const preset = getBusinessTypePreset(businessType);
    const normalizedSlug = slug.trim()
      ? slugifyBookingPageTitle(slug)
      : slugifyBookingPageTitle(title);

    startSaving(async () => {
      try {
        const response = await fetch("/api/calendar/booking-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: page?.id,
            slug: normalizedSlug,
            bookingPageTitle: title.trim(),
            slotDurationMinutes: duration,
            bookingTimezone: timeZone,
            weeklySchedule: serializeWeeklySchedule(schedule),
            bookingPagePublished: publish,
            businessType,
            businessTypeLabel: preset.label,
            slotBufferMinutes: bufferMinutes,
            advanceBookingDays: advanceDays,
            resources: serializedResources,
            formFields,
          }),
        });

        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          pageId?: string;
          slug?: string;
        };

        if (!response.ok || !result.success) {
          toast.error(result.message ?? ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed);
          return;
        }

        setPublished(publish);
        if (result.slug) {
          setSlug(result.slug);
        }

        toast.success(
          publish
            ? ORZUX_CALENDAR_MESSAGES.bookingPagePublished
            : ORZUX_CALENDAR_MESSAGES.bookingPageSaved,
        );

        const nextPageId = result.pageId ?? page?.id;
        router.push(
          nextPageId
            ? `${DASHBOARD_ROUTES.calendarBooking}/${nextPageId}`
            : DASHBOARD_ROUTES.calendarBooking,
        );
        router.refresh();
      } catch {
        toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageSaveFailed);
      }
    });
  }

  function copyPublicLink() {
    const path = PUBLIC_ROUTES.book(slug || slugifyBookingPageTitle(title));
    void navigator.clipboard.writeText(`${getPublicAppOrigin()}${path}`);
    toast.success(ORZUX_CALENDAR_MESSAGES.linkCopied);
  }

  function goToNextStep() {
    if (!canProceedFromStep(editorStep, title, schedule, resources)) {
      if (editorStep === 1) {
        setFieldErrors(getWeeklyScheduleFieldErrors(schedule));
        toast.error(ORZUX_CALENDAR_MESSAGES.resourcesTitle);
      } else if (editorStep === 2) {
        toast.error(ORZUX_CALENDAR_MESSAGES.bookingPageTitleRequired);
      }
      return;
    }

    setEditorStep((current) => Math.min(3, current + 1) as BookingEditorStep);
  }

  function goToPrevStep() {
    setEditorStep((current) => Math.max(1, current - 1) as BookingEditorStep);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b bg-muted/20 lg:h-full lg:w-[400px] lg:border-b-0 lg:border-r">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-end border-b px-4 py-3">
              <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
                <Link
                  href={DASHBOARD_ROUTES.calendarBooking}
                  aria-label={ORZUX_CALENDAR_MESSAGES.backToCalendar}
                >
                  <XIcon className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-6 pb-4">
                {editorStep === 1 ? (
                  <>
                    <BusinessTypePresetPicker
                      value={businessType}
                      onChange={setBusinessType}
                      onApplyPreset={(type) => applyPreset(type, true)}
                      onManualApplyPreset={() => applyPreset(businessType, false)}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="booking-duration">{ORZUX_CALENDAR_MESSAGES.meetingDuration}</Label>
                      <select
                        id="booking-duration"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {durationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <BookingResourcesEditor resources={resources} onChange={setResources} />

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">{ORZUX_CALENDAR_MESSAGES.availabilityTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {ORZUX_CALENDAR_MESSAGES.availabilitySubtitle}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {Array.from({ length: 7 }, (_, day) => {
                          const daySchedule = schedule[day]!;

                          return (
                            <div key={day} className="rounded-lg border bg-card px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="w-8 text-sm font-medium">{WEEKDAY_LABELS[day]}</span>

                                {daySchedule.enabled ? (
                                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="time"
                                        value={daySchedule.start}
                                        onChange={(e) => updateDay(day, { start: e.target.value })}
                                        onBlur={() =>
                                          setFieldErrors(getWeeklyScheduleFieldErrors(schedule))
                                        }
                                        aria-invalid={Boolean(fieldErrors[day]?.start)}
                                        className="h-8 flex-1 text-xs"
                                      />
                                      <span className="text-xs text-muted-foreground">–</span>
                                      <Input
                                        type="time"
                                        value={daySchedule.end}
                                        onChange={(e) => updateDay(day, { end: e.target.value })}
                                        onBlur={() =>
                                          setFieldErrors(getWeeklyScheduleFieldErrors(schedule))
                                        }
                                        aria-invalid={Boolean(fieldErrors[day]?.end)}
                                        className="h-8 flex-1 text-xs"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 shrink-0"
                                        aria-label={ORZUX_CALENDAR_MESSAGES.copyHours}
                                        onClick={() => copyHoursToAll(day)}
                                      >
                                        <CopyIcon className="size-3.5" />
                                      </Button>
                                    </div>
                                    {fieldErrors[day]?.start ? (
                                      <p className="text-xs text-destructive">{fieldErrors[day]?.start}</p>
                                    ) : null}
                                    {fieldErrors[day]?.end ? (
                                      <p className="text-xs text-destructive">{fieldErrors[day]?.end}</p>
                                    ) : null}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="flex flex-1 items-center gap-2 text-left text-sm text-muted-foreground"
                                    onClick={() => toggleDay(day)}
                                  >
                                    <PlusIcon className="size-4" />
                                    {ORZUX_CALENDAR_MESSAGES.unavailableDay}
                                  </button>
                                )}

                                {daySchedule.enabled ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0"
                                    onClick={() => toggleDay(day)}
                                  >
                                    <XIcon className="size-3.5" />
                                  </Button>
                                ) : null}
                              </div>

                              {daySchedule.enabled ? (
                                <p className="mt-1 pl-10 text-[11px] text-muted-foreground">
                                  {formatTime12h(daySchedule.start)} – {formatTime12h(daySchedule.end)}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <TimezonePicker
                      id="booking-timezone"
                      label={ORZUX_CALENDAR_MESSAGES.timezoneLabel}
                      value={timeZone}
                      onChange={setTimeZone}
                    />

                    <details className="rounded-lg border bg-card px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        {ORZUX_CALENDAR_MESSAGES.advancedSettings}
                      </summary>
                      <div className="mt-3 grid gap-3 pb-1">
                        <div className="space-y-1">
                          <Label htmlFor="booking-buffer" className="text-xs">
                            {ORZUX_CALENDAR_MESSAGES.bufferBetweenSlots}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="booking-buffer"
                              type="number"
                              min={0}
                              max={120}
                              value={bufferMinutes}
                              onChange={(e) => setBufferMinutes(Number(e.target.value))}
                              className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">
                              {ORZUX_CALENDAR_MESSAGES.minutesBuffer}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="booking-advance" className="text-xs">
                            {ORZUX_CALENDAR_MESSAGES.advanceBookingWindow}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="booking-advance"
                              type="number"
                              min={1}
                              max={90}
                              value={advanceDays}
                              onChange={(e) => setAdvanceDays(Number(e.target.value))}
                              className="h-8"
                            />
                            <span className="text-xs text-muted-foreground">
                              {ORZUX_CALENDAR_MESSAGES.daysAhead}
                            </span>
                          </div>
                        </div>
                      </div>
                    </details>
                  </>
                ) : null}

                {editorStep === 2 ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="booking-page-title">{ORZUX_CALENDAR_MESSAGES.pageNameLabel}</Label>
                      <Input
                        id="booking-page-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={ORZUX_CALENDAR_MESSAGES.pageNamePlaceholder}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booking-page-slug">{ORZUX_CALENDAR_MESSAGES.slugLabel}</Label>
                      <Input
                        id="booking-page-slug"
                        value={slug}
                        onChange={(e) => setSlug(slugifyBookingPageTitle(e.target.value))}
                        placeholder={slugifyBookingPageTitle(title)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {ORZUX_CALENDAR_MESSAGES.slugHint}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {getPublicAppOrigin()}
                        {PUBLIC_ROUTES.book(slug || slugifyBookingPageTitle(title))}
                      </p>
                      {published ? (
                        <Button type="button" variant="outline" size="sm" onClick={copyPublicLink}>
                          <CopyIcon className="size-4" />
                          {ORZUX_CALENDAR_MESSAGES.copyPublicLink}
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {editorStep === 3 ? (
                  <>
                    <BookingFormFieldsEditor fields={formFields} onChange={setFormFields} />

                    <div className="rounded-lg border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{ORZUX_CALENDAR_MESSAGES.publicBookingUrl}</p>
                      <p className="mt-1 break-all font-mono">
                        {getPublicAppOrigin()}
                        {PUBLIC_ROUTES.book(slug || slugifyBookingPageTitle(title))}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t bg-background p-4">
              {editorStep > 1 ? (
                <Button type="button" variant="outline" onClick={goToPrevStep}>
                  {ORZUX_CALENDAR_MESSAGES.bookingPrevStep}
                </Button>
              ) : null}

              {editorStep < 3 ? (
                <Button type="button" className="flex-1" onClick={goToNextStep}>
                  {ORZUX_CALENDAR_MESSAGES.bookingNextStep}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isSaving}
                    onClick={() => handleSave(false)}
                  >
                    {ORZUX_CALENDAR_MESSAGES.saveDraft}
                  </Button>
                  <Button className="flex-1" disabled={isSaving} onClick={() => handleSave(true)}>
                    {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                    {ORZUX_CALENDAR_MESSAGES.publishBookingPage}
                  </Button>
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
          <BookingPageWeekPreview
            weekStart={weekStart}
            schedule={schedule}
            timeZone={timeZone}
          />
        </section>
      </div>
    </div>
  );
}
