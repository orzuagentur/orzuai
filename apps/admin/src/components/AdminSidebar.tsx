"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BotIcon,
  Building2Icon,
  CreditCardIcon,
  FileTextIcon,
  HeadphonesIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";

import { AdminNotifications } from "@/components/AdminNotifications";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    title: "Платформа",
    items: [
      { href: "/dashboard", label: "Дашборд", icon: LayoutDashboardIcon },
      { href: "/businesses", label: "Бизнесы", icon: Building2Icon },
      { href: "/support", label: "Поддержка", icon: HeadphonesIcon },
      { href: "/announcements", label: "Уведомления", icon: MegaphoneIcon },
      { href: "/billing", label: "Биллинг", icon: CreditCardIcon },
      { href: "/billing/plans", label: "Тарифы", icon: CreditCardIcon },
      { href: "/audit", label: "Аудит", icon: ScrollTextIcon },
      { href: "/ai-expenses", label: "AI расходы", icon: BotIcon },
    ],
  },
  {
    title: "AI & система",
    items: [
      { href: "/ai-management", label: "Управление AI", icon: Settings2Icon },
      { href: "/settings/secrets", label: "API ключи", icon: KeyRoundIcon },
    ],
  },
  {
    title: "Команда",
    items: [
      { href: "/team", label: "Команда", icon: UsersIcon },
      { href: "/legal-pages", label: "Legal pages", icon: FileTextIcon },
    ],
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-card/50 md:w-60 md:min-h-[calc(100vh-3.5rem)] md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">OrzuX Admin</p>
          <p className="text-xs text-muted-foreground">Platform control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-x-auto p-2 md:overflow-visible">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {section.title}
            </p>
            <div className="flex gap-1 md:flex-col">
              {section.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>

      <AdminNotifications />
    </aside>
  );
}
