"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRoundIcon, ShieldIcon, UsersIcon } from "lucide-react";

import { AdminNotifications } from "@/components/AdminNotifications";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/settings/secrets",
    label: "Секреты и API",
    icon: KeyRoundIcon,
  },
  {
    href: "/team",
    label: "Команда",
    icon: UsersIcon,
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-card/50 md:w-56 md:min-h-[calc(100vh-3.5rem)] md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 border-b px-4 py-4 md:flex-col md:items-start">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">OrzuX Admin</p>
          <p className="text-xs text-muted-foreground">Platform control</p>
        </div>
      </div>

      <nav className="flex flex-1 gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <AdminNotifications />
    </aside>
  );
}
