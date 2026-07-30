"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ToastNotice";

type VoiceItem = {
  id: string;
  name: string;
  category: string | null;
  labels: string | null;
  gender: string | null;
  accent: string | null;
  age: string | null;
  preview_url: string | null;
  source?: "account" | "shared";
};

type GenderFilter = "all" | "male" | "female" | "neutral";

/** Empty string = Auto (AI picks) when allowAuto is true */
export function VoicePicker({
  value,
  onChange,
  hideSearch = false,
  allowAuto = false,
  compactList = false,
  fillHeight = false,
}: {
  value: string;
  onChange: (v: string) => void;
  hideSearch?: boolean;
  allowAuto?: boolean;
  compactList?: boolean;
  fillHeight?: boolean;
}) {
  const t = useTranslations("studio.voice");
  const tc = useTranslations("studio.common");
  const { show: toast, notice } = useToast();
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (search: string, g: GenderFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (g !== "all") params.set("gender", g);
        const res = await fetch(`/api/elevenlabs/voices?${params}`);
        const data = await res.json();
        if (!res.ok) {
          toast(data.error || t("failedLoadVoices"), "error");
          setVoices([]);
          return;
        }
        setVoices((data.voices || []) as VoiceItem[]);
      } catch {
        toast(tc("networkError"), "error");
        setVoices([]);
      } finally {
        setLoading(false);
      }
    },
    [toast, t, tc],
  );

  useEffect(() => {
    void load("", "all");
    return () => {
      audioRef.current?.pause();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  // Auto-select first voice only when Auto mode is off
  useEffect(() => {
    if (allowAuto) return;
    if (!value && voices[0]) onChange(voices[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices, allowAuto]);

  function onSearchChange(next: string) {
    setQ(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void load(next, gender);
    }, 320);
  }

  function onGenderChange(next: GenderFilter) {
    setGender(next);
    void load(q, next);
  }

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  }, []);

  async function play(voice: VoiceItem) {
    if (playingId === voice.id) {
      stop();
      return;
    }
    stop();
    setLoadingId(voice.id);
    try {
      let src = voice.preview_url;
      if (!src) {
        const res = await fetch(
          `/api/elevenlabs/preview?voiceId=${encodeURIComponent(voice.id)}`,
        );
        const type = res.headers.get("content-type") || "";
        if (type.includes("audio")) {
          src = URL.createObjectURL(await res.blob());
        } else {
          const data = await res.json();
          if (!res.ok) {
            toast(data.error || t("playbackError"), "error");
            setLoadingId(null);
            return;
          }
          src = data.previewUrl as string;
        }
      }
      const audio = new Audio(src!);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        toast(t("playbackError"), "error");
      };
      setPlayingId(voice.id);
      await audio.play();
    } catch {
      toast(t("playbackError"), "error");
      setPlayingId(null);
    } finally {
      setLoadingId(null);
    }
  }

  const filters: { id: GenderFilter; label: string }[] = [
    { id: "all", label: tc("all") },
    { id: "male", label: tc("male") },
    { id: "female", label: tc("female") },
    { id: "neutral", label: tc("neutral") },
  ];

  const autoOn = allowAuto && !value;

  return (
    <div
      className={`min-w-0 overflow-hidden ${fillHeight ? "flex h-full min-h-0 flex-col space-y-2" : compactList ? "space-y-2" : "space-y-3"}`}
    >
      {notice}
      {!hideSearch && (
        <>
          <input
            className="field w-full text-sm"
            placeholder={t("searchVoice")}
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => {
              const on = gender === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onGenderChange(f.id)}
                  className="rounded-full border px-3 py-1 text-xs transition"
                  style={{
                    borderColor: on ? "rgba(232,165,75,0.55)" : "var(--line)",
                    background: on ? "rgba(232,165,75,0.14)" : "transparent",
                    color: on ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {!loading && voices.length === 0 && (
        <p className="text-sm text-[color:var(--muted)]">{t("noVoices")}</p>
      )}

      <div
        className={`space-y-1.5 overflow-y-auto overflow-x-hidden rounded-xl border border-[color:var(--line)] p-1.5 sm:p-2 ${
          fillHeight
            ? "min-h-0 flex-1"
            : compactList
              ? "max-h-[148px]"
              : "max-h-[280px] sm:max-h-[320px]"
        }`}
      >
        {allowAuto && (
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left transition"
            style={{
              background: autoOn ? "rgba(232,165,75,0.12)" : "transparent",
              border: `1px solid ${
                autoOn ? "rgba(232,165,75,0.45)" : "transparent"
              }`,
            }}
            onClick={() => onChange("")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs">
              ✦
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-sm font-medium">
                {tc("auto")}
              </span>
              <span className="block truncate text-[11px] text-[color:var(--muted)]">
                {t("aiPicksVoice")}
              </span>
            </span>
            {autoOn && (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                ✓
              </span>
            )}
          </button>
        )}

        {voices.map((v) => {
          const isSelected = value === v.id;
          const playing = playingId === v.id;
          const busy = loadingId === v.id;
          return (
            <div
              key={`${v.source || "v"}-${v.id}`}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition"
              style={{
                background: isSelected
                  ? "rgba(232,165,75,0.12)"
                  : "transparent",
                border: `1px solid ${
                  isSelected ? "rgba(232,165,75,0.45)" : "transparent"
                }`,
              }}
            >
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                style={{
                  background: playing
                    ? "rgba(232,165,75,0.9)"
                    : "rgba(255,255,255,0.08)",
                  color: playing ? "#111" : "var(--fg)",
                }}
                disabled={busy}
                aria-label={playing ? tc("stop") : tc("play")}
                onClick={(e) => {
                  e.stopPropagation();
                  void play(v);
                }}
              >
                {busy ? "..." : playing ? "■" : "▶"}
              </button>

              <button
                type="button"
                className="min-w-0 flex-1 overflow-hidden text-left"
                onClick={() => onChange(v.id)}
              >
                <span className="block truncate text-sm font-medium">
                  {v.name}
                  {v.source === "shared" ? (
                    <span className="ml-1 text-[10px] font-normal text-[color:var(--muted)]">
                      shared
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-[11px] text-[color:var(--muted)]">
                  {[v.gender, v.accent, v.age, v.category]
                    .filter(Boolean)
                    .join(" · ") ||
                    v.labels ||
                    v.id}
                </span>
              </button>

              {isSelected && (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
