"use client";

type Props = {
  duration: number;
  current: number;
  trimStart: number;
  trimEnd: number;
  thumbs: string[];
  busy?: boolean;
  currentFrame?: string | null;
  onSeek: (ratio: number) => void;
};

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** CapCut-style timeline: high-quality video frames + live playhead frame. */
export function EditorFilmstrip({
  duration,
  current,
  trimStart,
  trimEnd,
  thumbs,
  busy,
  currentFrame,
  onSeek,
}: Props) {
  const playheadPct = duration > 0 ? (current / duration) * 100 : 0;
  const trimStartPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const trimWidthPct =
    duration > 0 ? ((trimEnd - trimStart) / duration) * 100 : 100;
  const slots = thumbs.length > 0 ? thumbs : Array.from({ length: 16 }, () => "");
  const activeIdx =
    thumbs.length > 0 && duration > 0
      ? Math.min(
          thumbs.length - 1,
          Math.max(0, Math.floor((current / duration) * thumbs.length)),
        )
      : -1;

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex items-end gap-3">
        <div
          className="h-[72px] w-[42px] shrink-0 overflow-hidden rounded-md border-2 border-[#E8A54B] bg-black shadow-lg"
          style={{
            backgroundImage: currentFrame
              ? `center / cover no-repeat url(${currentFrame})`
              : activeIdx >= 0 && thumbs[activeIdx]
                ? `center / cover no-repeat url(${thumbs[activeIdx]})`
                : undefined,
          }}
          title={`Frame @ ${formatTime(current)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-[10px] text-white/45">
            <span>
              {formatTime(current)} · trim {formatTime(trimStart)}–{formatTime(trimEnd)}
              {busy ? " · building frames…" : ""}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="relative h-[88px] cursor-pointer overflow-hidden rounded-lg border border-white/12 bg-black/60 shadow-inner"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(ratio);
            }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={current}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!(duration > 0)) return;
              if (e.key === "ArrowLeft") onSeek(Math.max(0, (current - 1) / duration));
              if (e.key === "ArrowRight") onSeek(Math.min(1, (current + 1) / duration));
            }}
          >
            <div className="absolute inset-0 flex">
              {slots.map((src, i) => (
                <div
                  key={`f-${i}`}
                  className="relative h-full min-w-0 flex-1 border-r border-black/50 last:border-r-0"
                  style={{
                    background: src
                      ? `center / cover no-repeat url(${src})`
                      : "linear-gradient(135deg,#141414,#242424)",
                    outline:
                      i === activeIdx ? "2px solid rgba(232,165,75,0.85)" : undefined,
                    outlineOffset: "-2px",
                    zIndex: i === activeIdx ? 2 : 1,
                  }}
                />
              ))}
            </div>

            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-black/60"
              style={{ width: `${trimStartPct}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 bg-black/60"
              style={{ width: `${Math.max(0, 100 - trimStartPct - trimWidthPct)}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 border-y-2 border-[#E8A54B]"
              style={{
                left: `${trimStartPct}%`,
                width: `${trimWidthPct}%`,
                boxShadow: "inset 0 0 0 1px rgba(232,165,75,0.4)",
              }}
            />

            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#E8A54B] shadow-[0_0_10px_rgba(232,165,75,0.9)]"
              style={{ left: `${playheadPct}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${playheadPct}%`, background: "#E8A54B" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
