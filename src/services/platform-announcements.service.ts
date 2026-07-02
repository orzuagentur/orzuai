import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PlatformAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

export const getActivePlatformAnnouncements = cache(
  async (userId: string): Promise<PlatformAnnouncement[]> => {
    const supabase = await createClient();

    const [{ data: announcements, error }, { data: dismissals }] =
      await Promise.all([
        supabase
          .from("platform_announcements")
          .select("id, title, body, severity")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("platform_announcement_dismissals")
          .select("announcement_id")
          .eq("user_id", userId),
      ]);

    if (error || !announcements?.length) {
      return [];
    }

    const dismissed = new Set(
      (dismissals ?? []).map((row) => row.announcement_id as string),
    );

    return announcements
      .filter((row) => !dismissed.has(row.id as string))
      .map((row) => ({
        id: row.id as string,
        title: row.title as string,
        body: row.body as string,
        severity: row.severity as PlatformAnnouncement["severity"],
      }));
  },
);
