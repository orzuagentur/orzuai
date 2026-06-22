"use client";

import { useEffect, useState, type ReactNode } from "react";

import { PanelArrowToggle } from "@/components/navigation/PanelArrowToggle";
import {
  CHANNEL_RAIL_ASIDE_CLASS,
  CHANNEL_RAIL_COLLAPSED_CLASS,
  CHANNEL_RAIL_MESSAGES,
  CHANNEL_RAIL_TOGGLE_CLASS,
} from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "orzu-channel-rail-collapsed";

type ChannelRailAsideProps = {
  children: ReactNode;
  className?: string;
};

export function ChannelRailAside({ children, className }: ChannelRailAsideProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") {
      setCollapsed(true);
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isCollapsed = hydrated && collapsed;

  if (isCollapsed) {
    return (
      <div className={cn(CHANNEL_RAIL_COLLAPSED_CLASS, className)}>
        <PanelArrowToggle
          direction="right"
          label={CHANNEL_RAIL_MESSAGES.expand}
          onClick={toggle}
          className={CHANNEL_RAIL_TOGGLE_CLASS}
        />
      </div>
    );
  }

  return (
    <aside className={cn(CHANNEL_RAIL_ASIDE_CLASS, "min-h-0", className)}>
      <div className="flex shrink-0 justify-end px-1.5 pt-1.5">
        <PanelArrowToggle
          direction="left"
          label={CHANNEL_RAIL_MESSAGES.collapse}
          onClick={toggle}
          className={CHANNEL_RAIL_TOGGLE_CLASS}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
