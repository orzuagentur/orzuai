"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type SavedChannel = {
  channel_id: string;
  title: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
};

/** Compact popover under "YouTube channels" — saved list only; Add opens Google OAuth. */
export function ChannelsMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("studio.channel");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const rootRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<SavedChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/youtube/channels", { cache: "no-store" });
      const data = await res.json();
      setSaved(data.saved || []);
      if (!res.ok) setErr(data.error || t("couldNotLoadChannels"));
    } catch {
      setErr(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }, [t, tc]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      // Ignore the toggle button so a second press can close the menu
      if ((target as Element).closest?.("[data-channels-toggle]")) return;
      if (!rootRef.current?.contains(target)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function openChannel(channelId: string) {
    setBusy(channelId);
    setErr(null);
    const res = await fetch("/api/youtube/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "switch", channelId }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || t("couldNotOpen"));
      return;
    }
    onClose();
    router.push("/dashboard/channel");
    router.refresh();
  }

  function connectYoutube() {
    window.location.assign("/api/youtube/connect");
  }

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="absolute left-0 top-full z-[80] mt-1.5 w-[min(calc(100vw-1.25rem),340px)] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] shadow-2xl sm:w-[min(100vw-2rem,300px)] sm:rounded-xl"
      role="dialog"
      aria-label={t("youtubeChannels")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)] px-3 py-2">
        <p className="text-xs font-semibold">{t("youtubeChannels")}</p>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-[11px] text-[color:var(--muted)]"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="max-h-[240px] space-y-1.5 overflow-y-auto p-2">
        {loading && (
          <p className="px-1 py-2 text-xs text-[color:var(--muted)]">
            {tCommon("loading")}
          </p>
        )}
        {err && (
          <p className="px-1 text-[11px] text-[color:var(--danger)]">{err}</p>
        )}
        {!loading && saved.length === 0 && (
          <p className="px-1 py-2 text-center text-xs text-[color:var(--muted)]">
            {t("noChannel")}
          </p>
        )}
        {saved.map((c) => (
          <MiniRow
            key={c.channel_id}
            title={c.title || "YouTube"}
            thumb={c.thumbnail_url}
            meta={
              busy === c.channel_id
                ? "..."
                : c.is_active
                  ? t("active")
                  : tc("open")
            }
            active={c.is_active}
            disabled={busy === c.channel_id}
            onClick={() => void openChannel(c.channel_id)}
          />
        ))}
      </div>

      <div className="border-t border-[color:var(--line)] p-2">
        <button
          type="button"
          onClick={connectYoutube}
          className="flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold text-white transition hover:brightness-110"
          style={{ background: "#FF0000" }}
        >
          + {t("connectYoutube")}
        </button>
      </div>
    </div>
  );
}

function MiniRow({
  title,
  thumb,
  meta,
  active,
  disabled,
  onClick,
}: {
  title: string;
  thumb: string | null;
  meta: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition hover:border-[color:rgba(232,165,75,0.4)]"
      style={{
        borderColor: active ? "rgba(232,165,75,0.5)" : "var(--line)",
        background: active ? "rgba(232,165,75,0.08)" : "transparent",
      }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/30 text-[9px]">
          YT
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{title}</span>
        <span className="block truncate text-[10px] text-[color:var(--muted)]">
          {meta}
        </span>
      </span>
    </button>
  );
}
