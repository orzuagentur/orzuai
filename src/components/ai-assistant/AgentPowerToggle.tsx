"use client";

import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

type AgentPowerToggleProps = {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
};

export function AgentPowerToggle({
  enabled,
  disabled = false,
  onChange,
  className,
}: AgentPowerToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-8 w-[4.25rem] shrink-0 items-center rounded-full border-2 transition-colors",
        enabled
          ? "border-emerald-500 bg-emerald-500"
          : "border-neutral-900 bg-neutral-900",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute text-[10px] font-bold uppercase tracking-wide text-white",
          enabled ? "left-2" : "right-2",
        )}
      >
        {enabled ? "On" : "Off"}
      </span>
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-transform",
          enabled ? "translate-x-[2.35rem]" : "translate-x-0.5",
        )}
      />
      {disabled ? (
        <Loader2Icon className="absolute inset-0 m-auto size-3.5 animate-spin text-white" />
      ) : null}
    </button>
  );
}
