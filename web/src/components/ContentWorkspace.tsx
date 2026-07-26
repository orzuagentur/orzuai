"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFeatureLocked } from "@/lib/product-locks-client";

type ReadyVideo = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** Creators → Content: pick a ready video and open the pro editor workspace. */
export function ContentWorkspace() {
  const t = useTranslations("studio.content");
  const tc = useTranslations("studio.creators");
  const ts = useTranslations("studio.common");
  const router = useRouter();
  const editorLocked = useFeatureLocked("video_editor");
  const [items, setItems] = useState<ReadyVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sb = createClient();
    void (async () => {
      const { data } = await sb
        .from("video_jobs")
        .select("id,title,thumbnail_url,duration_seconds,created_at,status")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      setLoading(false);
      setItems(
        (data || []).map((row) => ({
          id: String(row.id),
          title: row.title,
          thumbnail_url: row.thumbnail_url,
          duration_seconds: row.duration_seconds,
          created_at: row.created_at,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(var(--mobile-nav-space)+1.5rem)] pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/creators"
            className="mb-2 inline-block text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
          >
            {tc("backToCreators")}
          </Link>
          <h1
            className="text-3xl font-bold tracking-tight text-[var(--fg)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
          >
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{t("lead")}</p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-10 text-center">
          <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
          <Link
            href="/dashboard/content"
            className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-black"
            style={{ background: "#E8A54B" }}
          >
            {t("goAiVideo")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={editorLocked}
              onClick={() => {
                if (editorLocked) return;
                router.push(`/dashboard/editor/${v.id}`);
              }}
              className="group overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] text-left transition hover:border-[rgba(232,165,75,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div
                className="aspect-[9/16] bg-black bg-cover bg-center"
                style={{
                  backgroundImage: v.thumbnail_url
                    ? `url(${v.thumbnail_url})`
                    : undefined,
                }}
              />
              <div className="p-2.5">
                <p className="truncate text-sm font-medium text-[var(--fg)]">
                  {v.title || ts("untitled")}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {formatTime(Number(v.duration_seconds) || 0)}
                  {editorLocked ? ` · ${ts("soon")}` : ` · ${ts("edit")}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
