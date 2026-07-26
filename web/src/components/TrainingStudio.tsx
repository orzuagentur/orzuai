"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AiTraining, PublishSchedule } from "@/lib/types";
import {
  ScheduleStudio,
  normalizeSchedule,
  scheduleDefaults,
} from "@/components/ScheduleStudio";
import { TrainingVoiceMusicCard } from "@/components/TrainingVoiceMusicCard";
import {
  normalizeSubtitleStyle,
  SubtitleStylePicker,
} from "@/components/SubtitleStylePicker";
import { useToast } from "@/components/ToastNotice";
import {
  CTA_PRESETS,
  defaultDurationForFormat,
  durationPresetsForFormat,
  LANGUAGE_PRESETS,
  MONTAGE_PACE_PRESETS,
  NICHE_PRESETS,
  REPLY_STYLE_PRESETS,
  TRANSITION_PRESETS,
  VIDEO_FORMAT_PRESETS,
  VIDEO_STYLE_LOOK,
  VIDEO_STYLE_PRESETS,
  VISUAL_EFFECT_PRESETS,
  ensurePreset,
  type Preset,
} from "@/lib/training-presets";
import {
  trainingChecklist,
  trainingEmptyDefaults,
  trainingRequiredComplete,
} from "@/lib/training-required";
import {
  clampMusicVolume,
  clampVoiceVolume,
  defaultMusicPrefs,
  type MusicPrefs,
} from "@/lib/music-groups";

function snapshot(training: AiTraining, schedule: PublishSchedule) {
  return JSON.stringify({ training, schedule: normalizeSchedule(schedule) });
}

export function TrainingStudio({
  initial,
  schedule: scheduleInitial,
  channelTitle = null,
}: {
  initial: AiTraining | null;
  schedule: PublishSchedule | null;
  embeddedInChannel?: boolean;
  channelTitle?: string | null;
}) {
  const t = useTranslations("studio.training");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const enableAiFlow = searchParams.get("enableAi") === "1";

  const [form, setForm] = useState<AiTraining>(() => {
    const merged = {
      ...trainingEmptyDefaults,
      ...initial,
      learning_enabled: false,
    };
    const look =
      initial?.music_prefs &&
      typeof initial.music_prefs === "object" &&
      (initial.music_prefs as { montage_look?: Record<string, unknown> })
        .montage_look;
    if (look && typeof look === "object") {
      if (!merged.visual_effect && look.visual_effect != null) {
        merged.visual_effect = String(look.visual_effect);
      }
      if (
        (merged.preferred_transition == null || merged.preferred_transition === "") &&
        look.preferred_transition != null
      ) {
        merged.preferred_transition = String(look.preferred_transition);
      }
      if (!merged.montage_pace && look.montage_pace != null) {
        merged.montage_pace = String(look.montage_pace);
      }
      if (merged.flash_cuts == null && look.flash_cuts != null) {
        merged.flash_cuts = Boolean(look.flash_cuts);
      }
    }
    const rawFormat = String(merged.video_format || "shorts");
    const video_format =
      rawFormat === "simple" || rawFormat === "shorts_mixer"
        ? rawFormat === "shorts_mixer"
          ? "shorts"
          : "video"
        : rawFormat === "video" || rawFormat === "shorts"
          ? rawFormat
          : "shorts";
    return {
      ...merged,
      video_format,
      subtitle_style: normalizeSubtitleStyle(merged.subtitle_style),
      visual_effect: String(merged.visual_effect || "cinematic").trim() || "cinematic",
      preferred_transition: String(merged.preferred_transition ?? "").trim(),
      montage_pace: ["viral", "fast", "medium", "cinematic"].includes(
        String(merged.montage_pace || "").trim().toLowerCase(),
      )
        ? String(merged.montage_pace).trim().toLowerCase()
        : "medium",
      flash_cuts: Boolean(merged.flash_cuts),
      music_prefs: {
        ...defaultMusicPrefs(),
        ...(initial?.music_prefs || {}),
        // AI picks tracks by niche — no manual library selection
        active_group_id: "",
        selected_track_ids: [],
        volume: clampMusicVolume(
          Number(initial?.music_volume ?? initial?.music_prefs?.volume ?? 0.58),
        ),
        voice_volume: clampVoiceVolume(
          Number(
            initial?.voice_volume ??
              initial?.music_prefs?.voice_volume ??
              1.05,
          ),
        ),
      },
      music_group: "",
      music_volume: clampMusicVolume(
        Number(initial?.music_volume ?? initial?.music_prefs?.volume ?? 0.58),
      ),
      voice_volume: clampVoiceVolume(
        Number(
          initial?.voice_volume ?? initial?.music_prefs?.voice_volume ?? 1.05,
        ),
      ),
    };
  });
  const [schedule, setSchedule] = useState<PublishSchedule>(() =>
    normalizeSchedule({
      ...scheduleDefaults,
      ...scheduleInitial,
      // Schedule UI has no toggle; Channel controls on/off. Keep existing flag.
      enabled: scheduleInitial?.enabled ?? false,
    }),
  );
  const savedRef = useRef(snapshot(form, schedule));
  const { show: toast, notice } = useToast();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leavePrompt, setLeavePrompt] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(enableAiFlow);
  const allowLeaveRef = useRef(false);

  const checklist = useMemo(() => trainingChecklist(form), [form]);
  const requiredOk = trainingRequiredComplete(form);
  const checklistDone = checklist.filter((c) => c.done).length;

  const markDirty = useCallback(
    (nextForm: AiTraining, nextSchedule: PublishSchedule) => {
      setDirty(snapshot(nextForm, nextSchedule) !== savedRef.current);
    },
    [],
  );

  function setTraining<K extends keyof AiTraining>(
    key: K,
    value: AiTraining[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      markDirty(next, schedule);
      return next;
    });
  }

  function onScheduleChange(next: PublishSchedule) {
    const normalized = normalizeSchedule({
      ...next,
      enabled: schedule.enabled,
    });
    setSchedule(normalized);
    markDirty(form, normalized);
  }

  async function saveAll(options?: {
    goToChannel?: boolean;
  }): Promise<boolean> {
    if (!requiredOk) {
      toast(t("fillRequired"), "error");
      setChecklistOpen(true);
      return false;
    }

    setBusy(true);

    const schedulePayload = normalizeSchedule({
      ...schedule,
      enabled: enableAiFlow ? true : schedule.enabled,
    });
    const unique = new Set(schedulePayload.times);
    if (unique.size !== schedulePayload.times.length) {
      toast(t("timesDifferent"), "error");
      setBusy(false);
      return false;
    }
    const sortedMins = [...schedulePayload.times]
      .map((tm) => {
        const [h, m] = String(tm).split(":");
        return Number(h) * 60 + Number(m || 0);
      })
      .sort((a, b) => a - b);
    for (let i = 1; i < sortedMins.length; i++) {
      if (sortedMins[i] - sortedMins[i - 1] < 15) {
        toast(t("timesGap"), "error");
        setBusy(false);
        return false;
      }
    }

    const musicPrefs: MusicPrefs = {
      ...defaultMusicPrefs(),
      ...(form.music_prefs || {}),
      // AI picks music by niche — do not persist a user playlist
      active_group_id: "",
      selected_track_ids: [],
      volume: clampMusicVolume(Number(form.music_volume ?? form.music_prefs?.volume ?? 0.58)),
      voice_volume: clampVoiceVolume(
        Number(form.voice_volume ?? form.music_prefs?.voice_volume ?? 1.05),
      ),
    };

    const trainingBody = {
      ...form,
      learning_enabled: false,
      enable_ai: enableAiFlow || undefined,
      music_group: "",
      music_volume: musicPrefs.volume,
      voice_volume: musicPrefs.voice_volume,
      music_mood: form.niche || "",
      music_prefs: musicPrefs,
    };

    const [trainRes, schedRes] = await Promise.all([
      fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingBody),
      }),
      fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedulePayload),
      }),
    ]);

    const trainData = await trainRes.json();
    const schedData = await schedRes.json();
    setBusy(false);

    if (!trainRes.ok) {
      toast(trainData.error || t("failedSave"), "error");
      return false;
    }
    if (!schedRes.ok) {
      toast(schedData.error || t("failedSchedule"), "error");
      return false;
    }

    const savedSchedule = enableAiFlow
      ? { ...schedulePayload, enabled: true }
      : schedulePayload;
    savedRef.current = snapshot(
      { ...form, learning_enabled: false, is_trained: true },
      savedSchedule,
    );
    setForm((p) => ({ ...p, is_trained: true, learning_enabled: false }));
    setSchedule(savedSchedule);
    setDirty(false);
    toast(enableAiFlow ? t("savedAiOn") : t("saved"));
    if (options?.goToChannel || enableAiFlow) {
      allowLeaveRef.current = true;
      router.push("/dashboard/channel");
      router.refresh();
    } else {
      router.refresh();
    }
    return true;
  }

  function goBack() {
    if (dirty) {
      setLeavePrompt("/dashboard/channel");
      return;
    }
    allowLeaveRef.current = true;
    router.push("/dashboard/channel");
  }

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty || allowLeaveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dirty || allowLeaveRef.current) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      try {
        const url = new URL(href, window.location.origin);
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setLeavePrompt(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  async function confirmLeave(action: "save" | "discard" | "stay") {
    const href = leavePrompt;
    if (action === "stay") {
      setLeavePrompt(null);
      return;
    }
    if (action === "save") {
      const okSave = await saveAll();
      if (!okSave) return;
    }
    allowLeaveRef.current = true;
    setDirty(false);
    setLeavePrompt(null);
    if (href) {
      router.push(href);
      router.refresh();
    }
  }

  return (
    <div className="relative space-y-6 pb-24">
      {notice}
      <header className="sticky top-0 z-30 -mx-1 mb-2 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--line)] bg-[color:var(--bg)]/95 px-1 py-3 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={goBack}
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-black/20 px-3 py-1.5 text-sm text-[color:var(--muted)] transition hover:border-[color:rgba(232,165,75,0.4)] hover:text-[color:var(--fg)]"
          >
            <span aria-hidden>←</span>
            {tCommon("back")}
          </button>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {enableAiFlow
              ? t("fillAndSave")
              : channelTitle
                ? `Settings for ${channelTitle}`
                : t("scheduleStyle")}
            {dirty && (
              <span className="ml-2 text-[color:var(--accent)]">
                {t("unsaved")}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0"
          disabled={busy || (!dirty && !enableAiFlow) || !requiredOk}
          onClick={() => void saveAll({ goToChannel: true })}
        >
          {busy ? tc("saving") : tCommon("save")}
        </button>
      </header>

      {enableAiFlow && (
        <p className="rounded-xl border border-[color:rgba(232,165,75,0.35)] bg-[color:rgba(232,165,75,0.08)] px-4 py-3 text-sm">
          First AI content launch: check the items in the checklist (bottom right),
          then Save.
        </p>
      )}

      <section id="schedule" className="scroll-mt-8">
        <ScheduleStudio value={schedule} onChange={onScheduleChange} />
      </section>

      <div className="space-y-6">
        <section className="panel rise space-y-3 p-3 sm:space-y-4 sm:p-4">
          <SectionTitle
            title={t("content")}
            subtitle={t("nicheHint")}
            required
          />
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <PresetSelect
              label={t("niche")}
              value={form.niche}
              presets={ensurePreset(NICHE_PRESETS, form.niche)}
              onChange={(v) => setTraining("niche", v)}
              required
              compact
            />
            <PresetSelect
              label={t("language")}
              value={form.language}
              presets={ensurePreset(LANGUAGE_PRESETS, form.language)}
              onChange={(v) => setTraining("language", v)}
              required
              compact
            />
            <PresetSelect
              label={t("format")}
              value={form.video_format}
              presets={VIDEO_FORMAT_PRESETS}
              onChange={(v) => {
                const next = { ...form, video_format: v };
                const allowed = durationPresetsForFormat(v).map((p) => p.value);
                if (!allowed.includes(String(form.duration_seconds))) {
                  next.duration_seconds = defaultDurationForFormat(v);
                }
                setForm(next);
                markDirty(next, schedule);
              }}
              compact
              fixedOptions
            />
            <PresetSelect
              label={t("duration")}
              value={String(form.duration_seconds)}
              presets={ensurePreset(
                durationPresetsForFormat(form.video_format),
                String(form.duration_seconds),
              )}
              onChange={(v) => setTraining("duration_seconds", Number(v))}
              compact
            />
            <div className="sm:col-span-2">
              <PresetSelect
                label={t("cta")}
                value={form.cta}
                presets={ensurePreset(CTA_PRESETS, form.cta)}
                onChange={(v) => setTraining("cta", v)}
                optional
                compact
              />
            </div>
          </div>

          <SubtitleStylePicker
            value={form.subtitle_style}
            onChange={(id) => setTraining("subtitle_style", id)}
            disabled={busy}
          />

          <div className="space-y-3 border-t border-[color:var(--line)] pt-3">
            <div>
              <p className="text-sm font-semibold">{t("lookMontage")}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                Applied on every AI Short from this channel — beats script
                suggestions.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <PresetSelect
                label={t("editStyle")}
                value={form.video_style || ""}
                presets={ensurePreset(VIDEO_STYLE_PRESETS, form.video_style || "")}
                onChange={(v) => {
                  const pack = VIDEO_STYLE_LOOK[v];
                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      video_style: v,
                      ...(pack
                        ? {
                            visual_effect: pack.visual_effect,
                            preferred_transition: pack.preferred_transition,
                            montage_pace: pack.montage_pace,
                            flash_cuts: pack.flash_cuts,
                          }
                        : {}),
                    };
                    markDirty(updated, schedule);
                    return updated;
                  });
                }}
                optional
                compact
              />
              <PresetSelect
                label={t("colorGrade")}
                value={form.visual_effect || "cinematic"}
                presets={ensurePreset(
                  VISUAL_EFFECT_PRESETS,
                  form.visual_effect || "cinematic",
                )}
                onChange={(v) => setTraining("visual_effect", v)}
                compact
              />
              <PresetSelect
                label="Transition"
                value={form.preferred_transition ?? ""}
                presets={ensurePreset(
                  TRANSITION_PRESETS,
                  form.preferred_transition ?? "",
                )}
                onChange={(v) => setTraining("preferred_transition", v)}
                optional
                compact
              />
              <PresetSelect
                label="Pace"
                value={form.montage_pace || "medium"}
                presets={ensurePreset(
                  MONTAGE_PACE_PRESETS,
                  form.montage_pace || "medium",
                )}
                onChange={(v) => setTraining("montage_pace", v)}
                compact
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--line)] bg-black/15 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t("flashCuts")}</p>
                <p className="text-[11px] text-[color:var(--muted)]">
                  Punchy xfade pool between clips (viral energy).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(form.flash_cuts)}
                disabled={busy}
                onClick={() => setTraining("flash_cuts", !form.flash_cuts)}
                className="relative h-7 w-12 shrink-0 rounded-full transition"
                style={{
                  background: form.flash_cuts
                    ? "rgba(232,165,75,0.85)"
                    : "rgba(255,255,255,0.12)",
                }}
              >
                <span
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                  style={{
                    left: form.flash_cuts ? "1.4rem" : "0.2rem",
                  }}
                />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-[color:var(--line)] pt-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                Prompt{" "}
                <span className="font-normal normal-case tracking-normal opacity-70">
                  (optional)
                </span>
              </span>
              <AutoGrowTextarea
                className="field w-full resize-none text-sm"
                value={form.style_prompt}
                onChange={(v) => setTraining("style_prompt", v)}
                placeholder={t("extraInfo")}
                maxLength={2000}
                minRows={2}
              />
            </label>
          </div>
        </section>

        <TrainingVoiceMusicCard
          voiceId={form.voice_id}
          onVoiceChange={(v) => setTraining("voice_id", v)}
          musicVolume={Number(form.music_volume ?? form.music_prefs?.volume ?? 0.58)}
          voiceVolume={Number(
            form.voice_volume ?? form.music_prefs?.voice_volume ?? 1.05,
          )}
          onMusicVolumeChange={(v) => {
            setForm((prev) => {
              const updated = {
                ...prev,
                music_volume: v,
                music_prefs: {
                  ...defaultMusicPrefs(),
                  ...(prev.music_prefs || {}),
                  active_group_id: "",
                  selected_track_ids: [],
                  volume: v,
                  voice_volume: clampVoiceVolume(
                    Number(
                      prev.voice_volume ?? prev.music_prefs?.voice_volume ?? 1.05,
                    ),
                  ),
                },
              };
              markDirty(updated, schedule);
              return updated;
            });
          }}
          onVoiceVolumeChange={(v) => {
            setForm((prev) => {
              const updated = {
                ...prev,
                voice_volume: v,
                music_prefs: {
                  ...defaultMusicPrefs(),
                  ...(prev.music_prefs || {}),
                  active_group_id: "",
                  selected_track_ids: [],
                  volume: clampMusicVolume(
                    Number(prev.music_volume ?? prev.music_prefs?.volume ?? 0.58),
                  ),
                  voice_volume: v,
                },
              };
              markDirty(updated, schedule);
              return updated;
            });
          }}
        />

        <section className="panel rise space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t("comments")}</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--muted)]">
                When on, the worker reads new comments and AI-replies. You can also
                reply from each video in Channel. YouTube API cannot like/heart
                comments — only replies.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.reply_comments_enabled}
              onClick={() =>
                setTraining(
                  "reply_comments_enabled",
                  !form.reply_comments_enabled,
                )
              }
              className="relative h-7 w-12 shrink-0 rounded-full transition"
              style={{
                background: form.reply_comments_enabled
                  ? "rgba(232,165,75,0.85)"
                  : "rgba(255,255,255,0.12)",
              }}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition"
                style={{
                  left: form.reply_comments_enabled ? "1.4rem" : "0.2rem",
                }}
              />
            </button>
          </div>

          {form.reply_comments_enabled && (
            <div className="grid gap-4 border-t border-[color:var(--line)] pt-4 sm:grid-cols-2">
              <PresetSelect
                label={t("language")}
                value={form.reply_languages}
                presets={ensurePreset(
                  [
                    { value: "auto", label: t("autoDetect") },
                    { value: "en", label: t("english") },
                    { value: "ru", label: t("russian") },
                    { value: "de", label: t("german") },
                    { value: "uz", label: t("uzbek") },
                  ],
                  form.reply_languages,
                )}
                onChange={(v) => setTraining("reply_languages", v)}
              />
              <div className="sm:col-span-2">
                <PresetSelect
                  label={t("aiStyle")}
                  value={form.reply_style_prompt}
                  presets={ensurePreset(
                    REPLY_STYLE_PRESETS,
                    form.reply_style_prompt,
                  )}
                  onChange={(v) => setTraining("reply_style_prompt", v)}
                  multiline
                  optional
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Floating checklist — hidden when everything required is done */}
      {!requiredOk && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-2 sm:right-5 lg:bottom-6 lg:right-6">
          {checklistOpen && (
            <div
              className="w-[min(100vw-2.5rem,280px)] rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/95 p-4 shadow-2xl backdrop-blur-md"
              role="dialog"
              aria-label={t("requiredChecklist")}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("requiredChecklist")}</p>
                <span className="text-xs tabular-nums text-[color:var(--muted)]">
                  {checklistDone}/{checklist.length}
                </span>
              </div>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                      style={{
                        background: item.done
                          ? "rgba(74,222,128,0.2)"
                          : "rgba(255,255,255,0.06)",
                        color: item.done ? "var(--success)" : "var(--muted)",
                        border: `1px solid ${
                          item.done
                            ? "rgba(74,222,128,0.45)"
                            : "var(--line)"
                        }`,
                      }}
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span
                      style={{
                        color: item.done ? "var(--fg)" : "var(--muted)",
                      }}
                    >
                      {item.key === "niche"
                        ? t("niche")
                        : item.key === "language"
                          ? t("language")
                          : item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            aria-label={t("requiredChecklist")}
            aria-expanded={checklistOpen}
            onClick={() => setChecklistOpen((v) => !v)}
            className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105"
            style={{
              background: "rgba(232,165,75,0.25)",
              border: "1px solid rgba(232,165,75,0.55)",
              color: "var(--accent)",
            }}
          >
            <span className="font-[family-name:var(--font-syne)] text-sm font-bold tabular-nums">
              {checklistDone}/{checklist.length}
            </span>
          </button>
        </div>
      )}

      {leavePrompt !== null && (
        <UnsavedCard
          busy={busy}
          onSave={() => void confirmLeave("save")}
          onStay={() => void confirmLeave("stay")}
          onDiscard={() => void confirmLeave("discard")}
        />
      )}
    </div>
  );
}

function UnsavedCard({
  busy,
  onSave,
  onStay,
  onDiscard,
}: {
  busy: boolean;
  onSave: () => void;
  onStay: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("studio.training");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
      role="presentation"
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
      >
        <div>
          <h2 id="unsaved-title" className="text-lg font-semibold">
            {t("unsaved")}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            You changed settings but have not saved yet.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost text-sm"
            disabled={busy}
            onClick={onStay}
          >
            Stay
          </button>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            disabled={busy}
            style={{ color: "var(--danger)" }}
            onClick={onDiscard}
          >
            Don&apos;t save
          </button>
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? tc("saving") : tCommon("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
  minRows = 2,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const line = 22;
    const minH = minRows * line + 16;
    el.style.height = `${Math.max(minH, el.scrollHeight)}px`;
  }, [minRows]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={minRows}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SectionTitle({
  title,
  subtitle,
  required = false,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold sm:text-lg">
        {title}
        {required ? (
          <span className="ml-1" style={{ color: "var(--accent)" }} aria-hidden>
            *
          </span>
        ) : null}
      </h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-[color:var(--muted)] sm:text-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function PresetSelect({
  label,
  value,
  presets,
  onChange,
  multiline = false,
  optional = false,
  required = false,
  hint,
  compact = false,
  /** Only the given presets — no Own / Not set */
  fixedOptions = false,
}: {
  label: string;
  value: string;
  presets: Preset[];
  onChange: (v: string) => void;
  multiline?: boolean;
  optional?: boolean;
  required?: boolean;
  hint?: string;
  compact?: boolean;
  fixedOptions?: boolean;
}) {
  const t = useTranslations("studio.training");
  const empty = !value;
  const inList = !empty && presets.some((p) => p.value === value);
  const [ownMode, setOwnMode] = useState(!fixedOptions && !empty && !inList);
  const [open, setOpen] = useState(false);
  const [draftOwn, setDraftOwn] = useState(value);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const selected = presets.find((p) => p.value === value);
  const display = fixedOptions
    ? selected?.label || presets[0]?.label || value
    : ownMode
      ? value || "+ Own"
      : selected?.label ||
        (empty ? (required ? t("choose") : t("notSet")) : value);

  useEffect(() => {
    if (fixedOptions) {
      setOwnMode(false);
      return;
    }
    if (empty) setOwnMode(false);
  }, [empty, fixedOptions]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function place() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 200), window.innerWidth - 24);
      let left = rect.left;
      let top = rect.bottom + 6;
      left = Math.min(left, window.innerWidth - width - 12);
      left = Math.max(12, left);
      const popH = fixedOptions ? 140 : 240;
      if (top + popH > window.innerHeight - 12) {
        top = Math.max(12, rect.top - popH - 6);
      }
      setPos({ top, left, width });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, ownMode, fixedOptions]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
      if (!fixedOptions) {
        setOwnMode(!empty && !presets.some((p) => p.value === value));
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, empty, presets, value, fixedOptions]);

  function pick(v: string) {
    setOwnMode(false);
    onChange(v);
    setOpen(false);
  }

  function applyOwn() {
    const v = draftOwn.trim();
    if (!v) return;
    onChange(v);
    setOwnMode(true);
    setOpen(false);
  }

  const options: Preset[] = fixedOptions
    ? presets
    : [
        ...((optional || !required)
          ? [{ value: "", label: `— ${t("notSet")} —` }]
          : []),
        ...presets,
        { value: "__own__", label: "+ Own" },
      ];

  return (
    <div
      className={
        compact
          ? "space-y-1 rounded-xl border border-[color:var(--line)] bg-black/20 px-2.5 py-2"
          : "space-y-2"
      }
    >
      <span
        className={
          compact
            ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]"
            : "text-sm font-medium text-[color:var(--muted)]"
        }
      >
        {label}
        {required ? (
          <span className="ml-1" style={{ color: "var(--accent)" }} aria-hidden>
            *
          </span>
        ) : null}
        {optional && !required ? (
          <span className="ml-1 font-normal normal-case tracking-normal opacity-70">
            (optional)
          </span>
        ) : null}
      </span>

      <button
        ref={btnRef}
        type="button"
        className={
          compact
            ? "flex w-full items-center justify-between gap-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-2.5 py-1.5 text-left text-sm transition hover:border-[color:rgba(232,165,75,0.4)]"
            : "field !py-2 flex w-full items-center justify-between gap-2 text-left text-[15px]"
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!fixedOptions) {
            const preset = presets.some((p) => p.value === value);
            setDraftOwn(preset ? "" : value);
            setOwnMode(!empty && !preset);
          }
          setOpen((v) => !v);
        }}
      >
        <span
          className={`min-w-0 truncate ${empty && !ownMode && !fixedOptions ? "text-[color:var(--muted)]" : ""}`}
        >
          {display}
        </span>
        <span
          className="shrink-0 text-[10px] text-[color:var(--muted)]"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.15s ease",
          }}
        >
          ▾
        </span>
      </button>

      {hint && !compact && (
        <p className="text-[11px] text-[color:var(--muted)]">{hint}</p>
      )}

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            className="overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1.5 shadow-2xl"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 200,
              maxHeight: fixedOptions ? 140 : 240,
            }}
            role="listbox"
            aria-label={label}
          >
            <div
              className={`space-y-0.5 overflow-y-auto overscroll-contain ${
                fixedOptions ? "max-h-[120px]" : "max-h-[220px]"
              }`}
            >
              {options.map((o) => {
                const isOwn = o.value === "__own__";
                const active = isOwn
                  ? ownMode
                  : !ownMode && o.value === value;

                if (isOwn && ownMode) {
                  return (
                    <div
                      key="__own__"
                      className="space-y-2 rounded-lg px-2 py-2"
                      style={{ background: "rgba(232,165,75,0.1)" }}
                    >
                      <p className="px-1 text-xs font-semibold text-[color:var(--accent)]">
                        + Own
                      </p>
                      {multiline ? (
                        <textarea
                          className="field min-h-16 text-sm"
                          autoFocus
                          placeholder={t("yourValue")}
                          value={draftOwn}
                          onChange={(e) => setDraftOwn(e.target.value)}
                        />
                      ) : (
                        <input
                          className="field !py-1.5 text-sm"
                          autoFocus
                          placeholder={t("yourValue")}
                          value={draftOwn}
                          onChange={(e) => setDraftOwn(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applyOwn();
                            }
                          }}
                        />
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost px-2.5 py-1 text-xs"
                          onClick={() => setOwnMode(false)}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary px-2.5 py-1 text-xs"
                          onClick={applyOwn}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={o.value || "__empty__"}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className="block w-full rounded-lg px-2.5 py-2 text-left text-sm transition"
                    style={{
                      background: active
                        ? "rgba(232,165,75,0.18)"
                        : "transparent",
                      color: isOwn
                        ? "var(--accent)"
                        : active
                          ? "var(--accent)"
                          : o.value === ""
                            ? "var(--muted)"
                            : "var(--fg)",
                      fontWeight: isOwn || active ? 600 : undefined,
                    }}
                    onClick={() => {
                      if (isOwn) {
                        setOwnMode(true);
                        setDraftOwn(inList ? "" : value);
                        return;
                      }
                      pick(o.value);
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
