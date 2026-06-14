"use client";

import { cn } from "@/lib/utils";
import {
  formatUploadPercent,
  formatUploadSpeed,
} from "@/utils/format-upload-rate";
import type { ChatMessageData } from "@/types/chat.types";

type MediaUploadProgressOverlayProps = {
  progress?: number;
  speedBps?: number;
  phase?: ChatMessageData["uploadPhase"];
  className?: string;
};

export function MediaUploadProgressOverlay({
  progress = 0,
  speedBps,
  phase = "uploading",
  className,
}: MediaUploadProgressOverlayProps) {
  const percent = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col justify-end rounded-lg bg-black/45 p-2",
        className,
      )}
      aria-live="polite"
      aria-busy={percent < 100}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-medium text-white">
          <span>{formatUploadPercent(percent)}</span>
          {phase === "uploading" && speedBps ? (
            <span>{formatUploadSpeed(speedBps)}</span>
          ) : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
