"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2Icon, Loader2Icon, MessageSquareIcon } from "lucide-react";
import { toast } from "sonner";

import { TwilioIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toggleSmsAction } from "@/features/sms/actions/toggle-sms";
import { SMS_MESSAGES } from "@/features/sms/constants";
import { TWILIO_INTEGRATION_HREF } from "@/features/twilio/constants";
import type { VoiceAgentSettings, VoiceConnectionData } from "@/types/voice-agent.types";

type SmsActivatePanelProps = {
  connection: VoiceConnectionData | null;
  settings: VoiceAgentSettings | null;
  hasBusiness: boolean;
  embeddedInHub?: boolean;
};

export function SmsActivatePanel({
  connection,
  settings,
  hasBusiness,
  embeddedInHub = false,
}: SmsActivatePanelProps) {
  const router = useRouter();
  const [smsEnabled, setSmsEnabled] = useState(settings?.smsEnabled ?? false);
  const [isToggling, setIsToggling] = useState(false);

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";
  const headerClassName = embeddedInHub ? "px-0 pt-0" : undefined;
  const contentClassName = embeddedInHub ? "px-0 pb-0" : undefined;

  const twilioConnected = connection?.status === "connected";

  async function handleToggle(next: boolean) {
    setIsToggling(true);
    const result = await toggleSmsAction(next);
    setIsToggling(false);

    if (!result.success) {
      toast.error(result.message ?? SMS_MESSAGES.toggleFailed);
      return;
    }

    setSmsEnabled(next);
    toast.success(SMS_MESSAGES.toggleSuccess);
    router.refresh();
  }

  if (!hasBusiness) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{SMS_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>Complete your business profile first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!twilioConnected) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle className="flex items-center gap-2">
            <TwilioIcon className="size-5" />
            {SMS_MESSAGES.twilioRequiredTitle}
          </CardTitle>
          <CardDescription>{SMS_MESSAGES.twilioRequiredDescription}</CardDescription>
        </CardHeader>
        <CardContent className={contentClassName}>
          <Button asChild>
            <Link href={TWILIO_INTEGRATION_HREF}>{SMS_MESSAGES.openTwilioSetup}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className={headerClassName}>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="size-5 text-teal-600" />
          {SMS_MESSAGES.connectTitle}
        </CardTitle>
        <CardDescription>{SMS_MESSAGES.connectDescription}</CardDescription>
      </CardHeader>
      <CardContent className={`space-y-5 ${contentClassName ?? ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{SMS_MESSAGES.phoneLabel}</p>
            <p className="font-mono text-sm">{connection.phoneNumber ?? "—"}</p>
          </div>
          <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
            Twilio
          </Badge>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-900 dark:bg-zinc-950/30">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-zinc-600" />
          <div className="space-y-1">
            <p className="font-medium">
              {smsEnabled ? SMS_MESSAGES.smsEnabled : SMS_MESSAGES.smsDisabled}
            </p>
            <p className="text-muted-foreground">
              Toggle SMS to control whether inbound and outbound texts sync to Inbox.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={smsEnabled ? "outline" : "default"}
          disabled={isToggling}
          onClick={() => void handleToggle(!smsEnabled)}
        >
          {isToggling ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : smsEnabled ? (
            SMS_MESSAGES.disableSms
          ) : (
            SMS_MESSAGES.enableSms
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
