"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type PanelArrowToggleProps = {
  direction: "left" | "right";
  label: string;
  onClick: () => void;
  className?: string;
};

export function PanelArrowToggle({
  direction,
  label,
  onClick,
  className,
}: PanelArrowToggleProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 stroke-[2.5]" />
    </button>
  );
}
