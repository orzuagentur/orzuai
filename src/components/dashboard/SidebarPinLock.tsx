"use client";

import { LockIcon, LockOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarPinMode = "hover" | "locked-open" | "locked-closed";

const MESSAGES = {
  lockOpen: "Keep menu open",
  unlockOpen: "Allow menu to close on leave",
  lockClosed: "Keep menu closed",
  unlockClosed: "Allow menu to open on hover",
} as const;

type SidebarPinLockProps = {
  pinMode: SidebarPinMode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
};

export function SidebarPinLock({
  pinMode,
  isExpanded,
  onToggle,
  className,
}: SidebarPinLockProps) {
  const isLocked =
    pinMode === "locked-open" || pinMode === "locked-closed";

  const label = isExpanded
    ? isLocked
      ? MESSAGES.unlockOpen
      : MESSAGES.lockOpen
    : isLocked
      ? MESSAGES.unlockClosed
      : MESSAGES.lockClosed;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn(
        "size-6 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isLocked && "text-sidebar-foreground",
        className,
      )}
      aria-label={label}
      aria-pressed={isLocked}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      {isLocked ? (
        <LockIcon className="size-3.5" />
      ) : (
        <LockOpenIcon className="size-3.5" />
      )}
    </Button>
  );
}
