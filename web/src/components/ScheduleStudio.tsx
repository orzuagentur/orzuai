"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublishSchedule } from "@/lib/types";
import { TimeChip } from "@/components/TimeChip";
import { ScheduleSelectField } from "@/components/ScheduleSelectField";

const VIDEO_COUNT_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
}));

const TZ_OPTIONS = [
  "UTC",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Tashkent",
  "Asia/Almaty",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
].map((tz) => ({ value: tz, label: tz }));

const DEFAULT_TIMES = [
  "09:00",
  "14:00",
  "18:00",
  "20:00",
  "12:00",
  "16:00",
  "10:00",
  "21:00",
  "08:00",
  "22:00",
];

export const scheduleDefaults: PublishSchedule = {
  enabled: true,
  mode: "daily",
  videos_per_day: 2,
  times: ["09:00", "18:00"],
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  custom_dates: [],
  timezone: "Europe/Berlin",
};

export function padScheduleTimes(count: number, existing: string[]): string[] {
  const out = [...existing];
  while (out.length < count) {
    out.push(DEFAULT_TIMES[out.length] || "12:00");
  }
  return out.slice(0, count);
}

export function normalizeSchedule(
  form: PublishSchedule,
  datesText?: string,
): PublishSchedule {
  const videos_per_day = Math.min(10, Math.max(1, form.videos_per_day || 1));
  return {
    ...form,
    videos_per_day,
    times: padScheduleTimes(videos_per_day, form.times || []),
    custom_dates:
      datesText !== undefined
        ? datesText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : form.custom_dates || [],
  };
}

/** Controlled schedule editor — no save button (parent saves everything). */
export function ScheduleStudio({
  value,
  onChange,
}: {
  value: PublishSchedule;
  onChange: (next: PublishSchedule) => void;
}) {
  const t = useTranslations("studio.schedule");
  const [datesText, setDatesText] = useState(
    (value.custom_dates || []).join(", "),
  );

  const dayLabels = [
    { id: 1, label: t("mon") },
    { id: 2, label: t("tue") },
    { id: 3, label: t("wed") },
    { id: 4, label: t("thu") },
    { id: 5, label: t("fri") },
    { id: 6, label: t("sat") },
    { id: 7, label: t("sun") },
  ];

  const modeOptions: { value: string; label: string }[] = [
    { value: "daily", label: t("everyDay") },
    { value: "weekdays", label: t("weekdays") },
    { value: "custom_days", label: t("customDays") },
    { value: "dates", label: t("dates") },
  ];

  useEffect(() => {
    const padded = padScheduleTimes(value.videos_per_day, value.times || []);
    if (padded.join(",") !== (value.times || []).join(",")) {
      onChange({ ...value, times: padded });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.videos_per_day]);

  function patch(partial: Partial<PublishSchedule>) {
    onChange({ ...value, ...partial });
  }

  function toggleDay(day: number) {
    const set = new Set(value.weekdays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    patch({ weekdays: Array.from(set).sort() });
  }

  function setTimeAt(index: number, time: string) {
    const times = padScheduleTimes(value.videos_per_day, value.times || []);
    times[index] = time;
    patch({ times });
  }

  const videoOptions = (() => {
    const base = [...VIDEO_COUNT_OPTIONS];
    const cur = String(value.videos_per_day);
    if (!base.some((o) => o.value === cur)) {
      base.push({ value: cur, label: cur });
    }
    return base;
  })();

  const tzOptions = (() => {
    const base = [...TZ_OPTIONS];
    if (!base.some((o) => o.value === value.timezone)) {
      base.push({ value: value.timezone, label: value.timezone });
    }
    return base;
  })();

  return (
    <section className="panel rise space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold">{t("publishSchedule")}</p>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          {t("whenToPost")}
        </p>
      </div>

      <div className="space-y-3 border-t border-[color:var(--line)] pt-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <ScheduleSelectField
            label={t("mode")}
            value={value.mode}
            options={modeOptions}
            onChange={(v) => patch({ mode: v as PublishSchedule["mode"] })}
            allowOwn
            ownPlaceholder="Custom mode id"
          />
          <ScheduleSelectField
            label={t("videosPerDay")}
            value={String(value.videos_per_day)}
            options={videoOptions}
            onChange={(v) =>
              patch({
                videos_per_day: Math.min(10, Math.max(1, Number(v) || 1)),
              })
            }
            allowOwn
            ownKind="number"
            ownPlaceholder="1–10"
          />
          <ScheduleSelectField
            label={t("timezone")}
            value={value.timezone}
            options={tzOptions}
            onChange={(v) => patch({ timezone: v })}
            allowOwn
            ownPlaceholder="Europe/Berlin"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-[color:var(--muted)]">
            {t("times")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {padScheduleTimes(value.videos_per_day, value.times || []).map(
              (time, i) => (
                <TimeChip
                  key={i}
                  label={`#${i + 1}`}
                  value={time}
                  onChange={(v) => setTimeAt(i, v)}
                />
              ),
            )}
          </div>
        </div>

        {(value.mode === "custom_days" || value.mode === "weekdays") && (
          <div className="flex flex-wrap gap-1">
            {dayLabels.map((d) => {
              const on = value.weekdays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className="rounded-md px-2 py-1 text-xs"
                  style={{
                    background: on ? "rgba(232,165,75,0.16)" : "transparent",
                    border: `1px solid ${
                      on ? "rgba(232,165,75,0.5)" : "var(--line)"
                    }`,
                    color: on ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}

        {value.mode === "dates" && (
          <input
            className="field !py-2 text-sm"
            value={datesText}
            onChange={(e) => {
              setDatesText(e.target.value);
              patch({
                custom_dates: e.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              });
            }}
            placeholder={`${t("dates")}: 2026-07-20, 2026-07-25`}
          />
        )}
      </div>
    </section>
  );
}
