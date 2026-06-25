import { AdminPresence } from "@/components/AdminPresence";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminSignOutButton } from "@/components/AdminSignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminPresence />
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="flex h-14 items-center justify-end gap-2 px-4 md:px-6">
          <ThemeToggle />
          <AdminSignOutButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
