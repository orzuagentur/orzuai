"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShieldAlertIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";

import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  disconnectWhatsAppWebAction,
  startWhatsAppWebConnectionAction,
} from "@/features/whatsapp-web/actions";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { WhatsAppWebConnection } from "@/services/whatsapp-web.service";

type WhatsAppWebPanelProps = {
  connection: WhatsAppWebConnection | null;
  businessId: string | null;
  hasBusiness: boolean;
};

type LiveState = {
  status: WhatsAppWebConnection["status"];
  qrCode: string | null;
  phoneNumber: string | null;
  connectedAt: string | null;
};

function initialState(connection: WhatsAppWebConnection | null): LiveState {
  return {
    status: connection?.status ?? "disconnected",
    qrCode: connection?.qrCode ?? null,
    phoneNumber: connection?.phoneNumber ?? null,
    connectedAt: connection?.connectedAt ?? null,
  };
}

export function WhatsAppWebPanel({
  connection,
  businessId,
  hasBusiness,
}: WhatsAppWebPanelProps) {
  const router = useRouter();
  const [state, setState] = useState<LiveState>(() => initialState(connection));
  const [isStarting, setIsStarting] = useState(false);

  // Subscribe to QR/status changes in real time.
  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase || !businessId) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);
      if (cancelled || !authed) {
        return;
      }

      channel = supabase
        .channel(`whatsapp-web-${businessId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "whatsapp_web_connections",
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            const row = payload.new as {
              status: LiveState["status"];
              qr_code: string | null;
              phone_number: string | null;
              connected_at: string | null;
            };

            setState((prev) => {
              if (row.status === "connected" && prev.status !== "connected") {
                toast.success("WhatsApp connected.");
                router.refresh();
              }
              return {
                status: row.status,
                qrCode: row.qr_code,
                phoneNumber: row.phone_number,
                connectedAt: row.connected_at,
              };
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [businessId, router]);

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>No business found</CardTitle>
          <CardDescription>
            Create a business in settings before connecting WhatsApp.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleConnect() {
    setIsStarting(true);
    const result = await startWhatsAppWebConnectionAction();
    setIsStarting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setState((prev) => ({ ...prev, status: "pending_qr", qrCode: null }));
    toast.message("Generating QR code…");
  }

  if (state.status === "connected") {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>WhatsApp (personal)</CardTitle>
            <Badge>connected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 text-sm">
            <p className="flex items-center gap-2">
              <SmartphoneIcon className="size-4" />
              <span className="font-medium">
                {state.phoneNumber || "Linked device"}
              </span>
            </p>
            {state.connectedAt ? (
              <p className="mt-1 text-muted-foreground">
                Connected {new Date(state.connectedAt).toLocaleString("en-US")}
              </p>
            ) : null}
          </div>
          <IntegrationDangerZone
            resourceLabel="WhatsApp personal account"
            onDisconnect={disconnectWhatsAppWebAction}
            successMessage="WhatsApp disconnected."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle>Connect WhatsApp via QR</CardTitle>
        <CardDescription>
          Link your WhatsApp account like WhatsApp Web to read and send messages
          from the inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            This uses an unofficial WhatsApp Web connection. Meta may limit or
            ban numbers used with unofficial clients. The official WhatsApp
            Business (Cloud API) integration is the safest option.
          </p>
        </div>

        {state.status === "pending_qr" && state.qrCode ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={state.qrCode}
              alt="WhatsApp QR code"
              className="size-64 rounded-lg border bg-white p-2"
            />
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open WhatsApp on your phone.</li>
              <li>Tap Settings → Linked Devices → Link a Device.</li>
              <li>Scan this code. It refreshes automatically.</li>
            </ol>
          </div>
        ) : state.status === "pending_qr" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Waiting for the QR code from the worker…
            </p>
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={isStarting}
            onClick={() => void handleConnect()}
          >
            {isStarting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Generate QR code"
            )}
          </Button>
        )}

        {state.status === "pending_qr" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isStarting}
            onClick={() => void handleConnect()}
          >
            Regenerate QR
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
