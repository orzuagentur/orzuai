"use client";

import { PanelArrowToggle } from "@/components/navigation/PanelArrowToggle";
import { useSidebar } from "@/components/ui/sidebar";

const MESSAGES = {
  expand: "Expand menu",
  collapse: "Collapse menu",
} as const;

export function SidebarPanelToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isMobile) {
    return null;
  }

  return (
    <PanelArrowToggle
      direction={isCollapsed ? "right" : "left"}
      label={isCollapsed ? MESSAGES.expand : MESSAGES.collapse}
      onClick={toggleSidebar}
    />
  );
}
