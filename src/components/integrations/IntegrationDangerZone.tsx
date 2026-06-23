"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { INTEGRATIONS_MESSAGES } from "@/features/integrations";
import { clearConversationDetailCache } from "@/lib/client-cache/inbox-messenger-cache";

type IntegrationDangerZoneProps = {
  resourceLabel: string;
  onDisconnect: () => Promise<{ success: boolean; message?: string }>;
  successMessage: string;
};

export function IntegrationDangerZone({
  resourceLabel,
  onDisconnect,
  successMessage,
}: IntegrationDangerZoneProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm">("idle");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function handleConfirmDisconnect() {
    setIsDisconnecting(true);

    try {
      const result = await onDisconnect();

      if (!result.success) {
        toast.error(result.message ?? INTEGRATIONS_MESSAGES.disconnectError);
        return;
      }

      toast.success(successMessage);
      clearConversationDetailCache();
      setStep("idle");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : INTEGRATIONS_MESSAGES.disconnectError,
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <section className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{INTEGRATIONS_MESSAGES.dangerZoneTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {INTEGRATIONS_MESSAGES.dangerZoneDescription}
            </p>
          </div>

          {step === "idle" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setStep("confirm")}
            >
              {INTEGRATIONS_MESSAGES.disconnectStep1Button}
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-destructive/30 bg-background p-3">
              <p className="text-sm font-medium">
                {INTEGRATIONS_MESSAGES.disconnectStep2Title}
              </p>
              <p className="text-sm text-muted-foreground">
                {INTEGRATIONS_MESSAGES.disconnectStep2Description(resourceLabel)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDisconnecting}
                  onClick={() => {
                    void handleConfirmDisconnect();
                  }}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      {INTEGRATIONS_MESSAGES.disconnecting}
                    </>
                  ) : (
                    INTEGRATIONS_MESSAGES.disconnectConfirmButton
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDisconnecting}
                  onClick={() => setStep("idle")}
                >
                  {INTEGRATIONS_MESSAGES.disconnectCancelButton}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
