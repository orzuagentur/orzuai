"use client";

import { cn } from "@/lib/utils";

type VoiceMonitorWaveformProps = {
  active: boolean;
  className?: string;
};

const BAR_COUNT = 32;

export function VoiceMonitorWaveform({
  active,
  className,
}: VoiceMonitorWaveformProps) {
  return (
    <div
      className={cn(
        "flex h-14 items-end justify-center gap-0.5 rounded-xl bg-muted/40 px-3 py-2",
        className,
      )}
      aria-hidden={!active}
    >
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full bg-emerald-500/80 transition-all",
            active ? "animate-pulse" : "h-1 bg-muted-foreground/30",
          )}
          style={
            active
              ? {
                  height: `${20 + ((index * 17) % 70)}%`,
                  animationDelay: `${(index % 8) * 90}ms`,
                  animationDuration: `${520 + (index % 5) * 80}ms`,
                }
              : { height: "12%" }
          }
        />
      ))}
    </div>
  );
}
