"use client";

import { BellIcon, BellOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushNotificationsContext } from "@/components/pwa/push-notifications-context";

export function PushNotificationsPanel() {
  const {
    supported,
    enabledOnServer,
    permission,
    subscribed,
    busy,
    enable,
    disable,
    refreshState,
  } = usePushNotificationsContext();

  if (!supported) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOffIcon className="size-4" />
            Push notifications
          </CardTitle>
          <CardDescription>
            Your browser does not support web push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!enabledOnServer) {
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellIcon className="size-4" />
            Push notifications
          </CardTitle>
          <CardDescription>
            Push is not configured on the server yet. Add VAPID keys to your
            environment to enable new-lead alerts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellIcon className="size-4" />
          Push notifications
        </CardTitle>
        <CardDescription>
          Get notified about new leads with a custom sound, even when OrzuX is
          closed or you are on another tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {permission === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked in your browser. Allow them in site
            settings, then refresh this page.
          </p>
        ) : subscribed ? (
          <>
            <p className="text-sm text-muted-foreground">
              New-lead alerts are enabled on this device.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void disable()}
            >
              Disable on this device
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void enable()}
          >
            Enable on this device
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void refreshState()}
        >
          Refresh status
        </Button>
      </CardContent>
    </Card>
  );
}
