"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export type CreatorsStockProvider = "pexels" | "unsplash";

export type CreatorsStockItem = {
  id: string;
  key: string;
  kind: "photo" | "video";
  provider: CreatorsStockProvider;
  title: string;
  author: string;
  authorUrl: string | null;
  providerUrl: string;
  pageUrl: string | null;
  thumb: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  /** Unsplash guideline tracking */
  downloadLocation?: string | null;
};

function formatDuration(sec: number | null) {
  if (sec == null || Number.isNaN(sec)) return null;
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function estimateWeight(item: CreatorsStockItem) {
  const w = item.width && item.width > 0 ? item.width : 3;
  const h = item.height && item.height > 0 ? item.height : 4;
  return h / w + 0.12;
}

function useMasonryColumnCount() {
  const [count, setCount] = useState(2);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      const next = w < 640 ? 2 : w < 1024 ? 3 : w < 1280 ? 4 : 5;
      setCount((prev) => (prev === next ? prev : next));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return count;
}

function useStickyMasonry(
  items: CreatorsStockItem[],
  colCount: number,
  resetKey: string,
) {
  const [columns, setColumns] = useState<CreatorsStockItem[][]>(() =>
    Array.from({ length: colCount }, () => []),
  );
  const heightsRef = useRef<number[]>(Array.from({ length: colCount }, () => 0));
  const colsRef = useRef<CreatorsStockItem[][]>(
    Array.from({ length: colCount }, () => []),
  );
  const resetKeyRef = useRef(resetKey);
  const colCountRef = useRef(colCount);

  useEffect(() => {
    const keyChanged = resetKeyRef.current !== resetKey;
    const colsChanged = colCountRef.current !== colCount;
    resetKeyRef.current = resetKey;
    colCountRef.current = colCount;

    const flat = colsRef.current.flat();
    const isAppend =
      !keyChanged &&
      !colsChanged &&
      items.length > flat.length &&
      flat.length > 0 &&
      flat.every((it, i) => it.key === items[i]?.key);

    if (!isAppend) {
      heightsRef.current = Array.from({ length: colCount }, () => 0);
      colsRef.current = Array.from({ length: colCount }, () => []);
      if (items.length === 0) {
        setColumns(Array.from({ length: colCount }, () => []));
        return;
      }
      for (const item of items) {
        let min = 0;
        for (let i = 1; i < colCount; i++) {
          if (heightsRef.current[i] < heightsRef.current[min]) min = i;
        }
        colsRef.current[min].push(item);
        heightsRef.current[min] += estimateWeight(item);
      }
      setColumns(colsRef.current.map((c) => c.slice()));
      return;
    }

    const fresh = items.slice(flat.length);
    for (const item of fresh) {
      let min = 0;
      for (let i = 1; i < colCount; i++) {
        if (heightsRef.current[i] < heightsRef.current[min]) min = i;
      }
      colsRef.current[min].push(item);
      heightsRef.current[min] += estimateWeight(item);
    }
    setColumns(colsRef.current.map((c) => c.slice()));
  }, [items, colCount, resetKey]);

  return columns;
}

function SourceBadge({
  provider,
  providerUrl,
}: {
  provider: CreatorsStockProvider;
  providerUrl: string;
}) {
  const label = provider === "pexels" ? "Pexels" : "Unsplash";
  return (
    <a
      href={providerUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-2 z-[2] inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/85"
      title={`${label} — official source`}
    >
      {provider === "pexels" ? <PexelsMark /> : <UnsplashMark />}
      <span>{label}</span>
    </a>
  );
}

function PexelsMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#05A081" />
      <path
        fill="#fff"
        d="M12.5 6.5H8.2v11h4.1c2.7 0 4.5-1.7 4.5-4.3 0-1.7-1-3-2.5-3.5 1.1-.5 1.8-1.6 1.8-2.9 0-2-1.6-3.3-3.6-3.3zm-.2 5.2H10V8.3h2.2c1.1 0 1.8.6 1.8 1.6s-.7 1.8-1.7 1.8zm.3 4.5H10v-3.4h2.5c1.3 0 2.1.7 2.1 1.8s-.8 1.6-2 1.6z"
      />
    </svg>
  );
}

function UnsplashMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="4" fill="#111" />
      <path fill="#fff" d="M7.5 9.5h3v-3h3v3h3v9h-9v-9zm3 2v5h3v-5h-3z" />
    </svg>
  );
}

async function downloadStock(item: CreatorsStockItem) {
  if (item.provider === "unsplash" && item.downloadLocation) {
    await fetch("/api/unsplash/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: item.downloadLocation }),
    });
    if (item.downloadUrl) {
      window.open(item.downloadUrl, "_blank", "noopener,noreferrer");
    }
    return;
  }
  if (!item.downloadUrl) return;
  const params = new URLSearchParams({
    url: item.downloadUrl,
    type: item.kind,
    filename: `${item.provider}-${item.id}`,
  });
  // Already proxied URLs start with /api/
  const href = item.downloadUrl.startsWith("/api/")
    ? item.downloadUrl
    : `/api/media/download?${params}`;
  const res = await fetch(href);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download =
    item.kind === "video"
      ? `${item.provider}-${item.id}.mp4`
      : `${item.provider}-${item.id}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function CreatorsMediaMasonry({
  items,
  loading,
  loadingMore,
  emptyText,
  resetKey,
  sentinelRef,
  onError,
}: {
  items: CreatorsStockItem[];
  loading: boolean;
  loadingMore: boolean;
  emptyText: string;
  resetKey: string;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onError: (msg: string) => void;
}) {
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");
  const colCount = useMasonryColumnCount();
  const columns = useStickyMasonry(items, colCount, resetKey);
  const [viewer, setViewer] = useState<CreatorsStockItem | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const onDownload = useCallback(
    async (item: CreatorsStockItem) => {
      setBusyKey(item.key);
      try {
        await downloadStock(item);
      } catch (e) {
        onError(e instanceof Error ? e.message : tc("downloadFailed"));
      } finally {
        setBusyKey(null);
      }
    },
    [onError, tc],
  );

  if (loading && !items.length) {
    return <p className="text-sm text-[color:var(--muted)]">{tCommon("loading")}</p>;
  }
  if (!items.length) {
    return <p className="text-sm text-[color:var(--muted)]">{emptyText}</p>;
  }

  return (
    <>
      <div className="flex items-start gap-3">
        {columns.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
            {col.map((item) => (
              <StockCard
                key={item.key}
                item={item}
                busy={busyKey === item.key}
                onOpen={() => setViewer(item)}
                onDownload={() => void onDownload(item)}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {loadingMore && (
        <p className="pb-2 text-center text-xs text-[color:var(--muted)]">
          {tc("loadingMore")}
        </p>
      )}
      {viewer && (
        <StockViewer
          item={viewer}
          busy={busyKey === viewer.key}
          onClose={() => setViewer(null)}
          onDownload={() => void onDownload(viewer)}
        />
      )}
    </>
  );
}

function StockCard({
  item,
  busy,
  onOpen,
  onDownload,
}: {
  item: CreatorsStockItem;
  busy: boolean;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const tc = useTranslations("studio.common");
  const dur = formatDuration(item.durationSec);
  const w = item.width && item.width > 0 ? item.width : 3;
  const h = item.height && item.height > 0 ? item.height : 4;
  const providerUrl =
    item.provider === "pexels"
      ? "https://www.pexels.com/"
      : item.providerUrl ||
        "https://unsplash.com/?utm_source=orzuai&utm_medium=referral";

  return (
    <article className="overflow-hidden rounded-xl border border-[color:var(--line)] bg-black/25">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="group relative block w-full cursor-pointer overflow-hidden bg-black/40 text-left"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--muted)]">
            No preview
          </div>
        )}

        <SourceBadge provider={item.provider} providerUrl={providerUrl} />

        {dur && (
          <span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
            {dur}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-[color:var(--muted)]">
            {item.authorUrl ? (
              <a
                href={item.authorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--fg)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.author}
              </a>
            ) : (
              item.author
            )}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-[10px] font-semibold text-[color:var(--accent)] disabled:opacity-50"
          disabled={busy || !item.downloadUrl}
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          {busy ? "…" : tc("save")}
        </button>
      </div>
    </article>
  );
}

function StockViewer({
  item,
  busy,
  onClose,
  onDownload,
}: {
  item: CreatorsStockItem;
  busy: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const t = useTranslations("studio.creators");
  const tc = useTranslations("studio.common");
  const tCommon = useTranslations("common");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const providerLabel = item.provider === "pexels" ? "Pexels" : "Unsplash";
  const providerHome =
    item.provider === "pexels"
      ? "https://www.pexels.com/"
      : "https://unsplash.com/?utm_source=orzuai&utm_medium=referral";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-syne)] text-sm font-semibold">
              {item.author}
            </p>
            <p className="truncate text-xs text-[color:var(--muted)]">
              {item.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[color:var(--muted)] hover:text-[color:var(--fg)]"
          >
            {tCommon("close")}
          </button>
        </div>
        <div className="relative flex max-h-[60vh] items-center justify-center bg-black">
          {item.kind === "video" && item.previewUrl ? (
            <video
              src={item.previewUrl}
              poster={item.thumb || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[60vh] w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl || item.thumb || ""}
              alt={item.title}
              className="max-h-[60vh] w-full object-contain"
            />
          )}
        </div>
        <p className="px-4 pt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
          {item.kind === "video" ? t("videoBy") : t("photoBy")}{" "}
          {item.authorUrl ? (
            <a
              href={item.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              {item.author}
            </a>
          ) : (
            item.author
          )}{" "}
          on{" "}
          <a
            href={providerHome}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--accent)] underline-offset-2 hover:underline"
          >
            {providerLabel}
          </a>
        </p>
        <div className="flex flex-col gap-2 p-4 sm:flex-row">
          <button
            type="button"
            className="btn btn-primary flex-1 text-sm"
            disabled={busy || !item.downloadUrl}
            onClick={onDownload}
          >
            {busy ? tc("saving") : tCommon("download")}
          </button>
          {item.pageUrl && (
            <a
              href={item.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost flex-1 text-center text-sm"
            >
              {item.provider === "unsplash"
                ? t("viewOnUnsplash")
                : `View on ${providerLabel}`}
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function mapPexelsMediaToStock(
  row: {
    id: string;
    kind: string;
    title: string;
    author: string;
    authorUrl?: string | null;
    provider?: string;
    providerLabel?: string;
    thumb: string | null;
    previewUrl: string | null;
    downloadUrl: string | null;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    pageUrl: string | null;
  },
): CreatorsStockItem | null {
  if (row.kind !== "photo" && row.kind !== "video") return null;
  return {
    id: row.id,
    key: `pexels:${row.kind}:${row.id}`,
    kind: row.kind,
    provider: "pexels",
    title: row.title,
    author: row.author,
    authorUrl: row.authorUrl || null,
    providerUrl: "https://www.pexels.com/",
    pageUrl: row.pageUrl,
    thumb: row.thumb,
    previewUrl: row.previewUrl,
    downloadUrl: row.downloadUrl,
    width: row.width,
    height: row.height,
    durationSec: row.durationSec,
  };
}

export function mapUnsplashToStock(photo: {
  id: string;
  alt: string;
  description: string | null;
  urls: { regular: string; full: string; small: string };
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  unsplashUrl: string;
  downloadLocation: string;
  width: number;
  height: number;
}): CreatorsStockItem {
  return {
    id: photo.id,
    key: `unsplash:photo:${photo.id}`,
    kind: "photo",
    provider: "unsplash",
    title: photo.description || photo.alt,
    author: photo.photographer.name,
    authorUrl: photo.photographer.profileUrl,
    providerUrl:
      "https://unsplash.com/?utm_source=orzuai&utm_medium=referral",
    pageUrl: photo.unsplashUrl,
    thumb: photo.urls.small || photo.urls.regular,
    previewUrl: photo.urls.regular,
    downloadUrl: photo.urls.full,
    width: photo.width || null,
    height: photo.height || null,
    durationSec: null,
    downloadLocation: photo.downloadLocation,
  };
}

export function PexelsCategoryCard({
  onClick,
  hover,
  onHover,
}: {
  onClick: () => void;
  hover: boolean;
  onHover: (on: boolean) => void;
}): ReactNode {
  const t = useTranslations("studio.creators");

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="relative aspect-square overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/40 outline-none"
    >
      <span className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#05A081]/25 to-transparent p-4">
        <PexelsMarkLarge />
        <span className="font-[family-name:var(--font-syne)] text-sm font-semibold">
          Pexels
        </span>
        <span className="text-[11px] text-[color:var(--muted)]">
          {t("photosStock")}
        </span>
      </span>
      {hover && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 text-left">
          <p className="font-[family-name:var(--font-syne)] text-sm font-semibold text-white">
            Pexels
          </p>
          <p className="text-[11px] text-white/75">{t("officialPexels")}</p>
        </div>
      )}
    </button>
  );
}

function PexelsMarkLarge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#05A081" />
      <path
        fill="#fff"
        d="M12.5 6.5H8.2v11h4.1c2.7 0 4.5-1.7 4.5-4.3 0-1.7-1-3-2.5-3.5 1.1-.5 1.8-1.6 1.8-2.9 0-2-1.6-3.3-3.6-3.3zm-.2 5.2H10V8.3h2.2c1.1 0 1.8.6 1.8 1.6s-.7 1.8-1.7 1.8zm.3 4.5H10v-3.4h2.5c1.3 0 2.1.7 2.1 1.8s-.8 1.6-2 1.6z"
      />
    </svg>
  );
}
