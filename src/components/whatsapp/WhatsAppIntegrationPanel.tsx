"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

import { ConnectWhatsAppForm } from "@/components/whatsapp/ConnectWhatsAppForm";
import { VerifyWhatsAppForm } from "@/components/whatsapp/VerifyWhatsAppForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useSyncWhatsApp } from "@/hooks/use-sync-whatsapp";
import type { WhatsAppConnectionData } from "@/types/whatsapp.types";

type WhatsAppIntegrationPanelProps = {
  connection: WhatsAppConnectionData | null;
  hasBusiness: boolean;
  webhookUrl: string;
};

function getStatusVariant(
  status: WhatsAppConnectionData["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function WhatsAppIntegrationPanel({
  connection,
  hasBusiness,
  webhookUrl,
}: WhatsAppIntegrationPanelProps) {
  const router = useRouter();
  const [pendingConnectionId, setPendingConnectionId] = useState(
    connection?.status === "pending" ? connection.id : null,
  );
  const { sync, isLoading: isSyncing } = useSyncWhatsApp({
    onSuccess: () => router.refresh(),
  });

  const activeConnectionId = useMemo(
    () => pendingConnectionId ?? connection?.id ?? null,
    [connection?.id, pendingConnectionId],
  );

  function handleRefresh() {
    router.refresh();
  }

  if (!hasBusiness) {
    return (
      <Card className="mx-auto max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WHATSAPP_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {WHATSAPP_MESSAGES.noBusinessDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>{WHATSAPP_MESSAGES.connectTitle}</CardTitle>
              <CardDescription>
                {WHATSAPP_MESSAGES.connectDescription}
              </CardDescription>
            </div>
            {connection ? (
              <Badge variant={getStatusVariant(connection.status)}>
                {connection.status}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {connection?.status === "connected" ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Phone:</span>{" "}
                  {connection.phoneNumber}
                </p>
                <p>
                  <span className="font-medium">Phone Number ID:</span>{" "}
                  {connection.metaPhoneNumberId}
                </p>
                {connection.lastSyncedAt ? (
                  <p>
                    <span className="font-medium">Last synced:</span>{" "}
                    {new Date(connection.lastSyncedAt).toLocaleString("en-US")}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isSyncing}
                onClick={() => {
                  void sync();
                }}
              >
                {isSyncing ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="size-4" />
                    Sync messages
                  </>
                )}
              </Button>
            </div>
          ) : activeConnectionId ? (
            <VerifyWhatsAppForm
              connectionId={activeConnectionId}
              onVerified={handleRefresh}
            />
          ) : (
            <ConnectWhatsAppForm
              onConnected={(connectionId) => {
                setPendingConnectionId(connectionId);
                handleRefresh();
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Webhook</CardTitle>
          <CardDescription>{WHATSAPP_MESSAGES.webhookUrlHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">
            {webhookUrl}
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
