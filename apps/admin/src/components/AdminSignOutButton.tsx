"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { createAdminSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createAdminSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
    >
      <LogOutIcon className="size-4" />
      Выйти
    </button>
  );
}
