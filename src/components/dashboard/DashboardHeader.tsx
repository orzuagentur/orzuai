"use client";

import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
