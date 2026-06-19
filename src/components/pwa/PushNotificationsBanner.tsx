"use client";

import { useState } from "react";
import { BellIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotificationsContext } from "@/components/pwa/push-notifications-context";

export function PushNotificationsBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { supported, enabledOnServer, permission, subscribed, busy, enable } =
    usePushNotificationsContext();

  if (
    dismissed ||
    !supported ||
    !enabledOnServer ||
    subscribed ||
    permission === "denied"
  ) {
    return null;
  }

  async function handleEnable() {
    const success = await enable();

    if (success) {
      setDismissed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <BellIcon className="size-4" />
        <span>
          Enable push notifications to get alerts for new messages from every
          channel when you are away from the site.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={handleEnable}>
          Enable notifications
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setDismissed(true)}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
