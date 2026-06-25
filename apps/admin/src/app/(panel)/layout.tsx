import Link from "next/link";
import { KeyRoundIcon } from "lucide-react";

import { AdminSignOutButton } from "@/components/AdminSignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">OrzuX Admin</p>
              <p className="text-xs text-muted-foreground">Platform control</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/settings/secrets"
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
            >
              Секреты и API ключи
            </Link>
            <ThemeToggle />
            <AdminSignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
