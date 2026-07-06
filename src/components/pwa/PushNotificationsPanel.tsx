"use client";

import { useState } from "react";
import { BellIcon, BellOffIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushNotificationsContext } from "@/components/pwa/push-notifications-context";

const cardClass = (layout: "default" | "settings") =>
  layout === "settings" ? "shadow-none" : "mx-auto w-full max-w-3xl";

export function PushNotificationsPanel({
  layout = "default",
}: {
  layout?: "default" | "settings";
}) {
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
  const [testing, setTesting] = useState(false);

  async function handleTestNotification() {
    setTesting(true);

    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        toast.error(payload.message ?? "Unable to send test notification.");
        return;
      }

      toast.success(payload.message ?? "Test notification sent.");
    } catch {
      toast.error("Unable to send test notification.");
    } finally {
      setTesting(false);
    }
  }

  if (!supported) {
    return (
      <Card className={cardClass(layout)}>
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
      <Card className={cardClass(layout)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellIcon className="size-4" />
            Push notifications
          </CardTitle>
          <CardDescription>
            Push is not configured on the server yet. Add VAPID keys to your
            environment to enable message alerts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cardClass(layout)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BellIcon className="size-4" />
          Push notifications
        </CardTitle>
        <CardDescription>
          Get notified about new WhatsApp, Telegram, and website form messages
          even when OrzuX is closed or you are on another tab. The system
          notification sound plays immediately; the custom OrzuX sound plays
          when a browser tab with OrzuX is open in the background.
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
              Message alerts are enabled on this device.
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy || testing}
              onClick={() => void handleTestNotification()}
            >
              {testing ? "Sending…" : "Send test notification"}
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
          disabled={busy || testing}
          onClick={() => void refreshState()}
        >
          Refresh status
        </Button>
      </CardContent>
    </Card>
  );
}
