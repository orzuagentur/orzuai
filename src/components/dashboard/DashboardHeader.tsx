"use client";

import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <DashboardBreadcrumbs className="min-w-0 flex-1" />
      <ThemeToggle />
    </header>
  );
}
