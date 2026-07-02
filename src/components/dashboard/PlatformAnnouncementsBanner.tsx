"use client";

import { useRouter } from "next/navigation";
import { AlertTriangleIcon, InfoIcon, XIcon } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { dismissPlatformAnnouncementAction } from "@/features/platform-support/actions";
import { cn } from "@/lib/utils";
import type { PlatformAnnouncement } from "@/services/platform-announcements.service";

type PlatformAnnouncementsBannerProps = {
  announcements: PlatformAnnouncement[];
};

function severityStyles(severity: PlatformAnnouncement["severity"]) {
  switch (severity) {
    case "critical":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "warning":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    default:
      return "border-primary/30 bg-primary/5 text-foreground";
  }
}

export function PlatformAnnouncementsBanner({
  announcements,
}: PlatformAnnouncementsBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 border-b bg-muted/20 px-4 py-3">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-3 py-2",
            severityStyles(announcement.severity),
          )}
        >
          {announcement.severity === "info" ? (
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{announcement.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{announcement.body}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await dismissPlatformAnnouncementAction({
                  announcementId: announcement.id,
                });
                router.refresh();
              });
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
