"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, ShieldAlertIcon, UserIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmTelegramUserCodeAction,
  confirmTelegramUserPasswordAction,
  disconnectTelegramUserAction,
  startTelegramUserLoginAction,
} from "@/features/telegram-user/actions";
import type { TelegramUserConnection } from "@/services/telegram-user.service";

type Step = "phone" | "code" | "password" | "connected";

type TelegramUserPanelProps = {
  connection: TelegramUserConnection | null;
  hasBusiness: boolean;
  isConfigured: boolean;
};

function initialStep(connection: TelegramUserConnection | null): Step {
  switch (connection?.status) {
    case "connected":
      return "connected";
    case "pending_password":
      return "password";
    case "pending_code":
      return "code";
    default:
      return "phone";
  }
}

export function TelegramUserPanel({
  connection,
  hasBusiness,
  isConfigured,
}: TelegramUserPanelProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => initialStep(connection));
  const [phone, setPhone] = useState(connection?.phoneNumber ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>No business found</CardTitle>
          <CardDescription>
            Create a business in settings before connecting Telegram.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isConfigured) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>Telegram personal account</CardTitle>
          <CardDescription>
            This feature is not configured. Set TELEGRAM_API_ID and
            TELEGRAM_API_HASH (from my.telegram.org) in the environment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleStart() {
    if (!phone.trim()) {
      return;
    }
    setIsLoading(true);
    const result = await startTelegramUserLoginAction(phone.trim());
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Code sent to your Telegram app.");
    setStep("code");
  }

  async function handleCode() {
    if (!code.trim()) {
      return;
    }
    setIsLoading(true);
    const result = await confirmTelegramUserCodeAction(code.trim());
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    if (result.status === "pending_password") {
      toast.message("Two-factor password required.");
      setCode("");
      setStep("password");
      return;
    }

    toast.success("Telegram account connected.");
    router.refresh();
    setStep("connected");
  }

  async function handlePassword() {
    if (!password.trim()) {
      return;
    }
    setIsLoading(true);
    const result = await confirmTelegramUserPasswordAction(password.trim());
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success("Telegram account connected.");
    setPassword("");
    router.refresh();
    setStep("connected");
  }

  if (step === "connected") {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Telegram personal account</CardTitle>
            <Badge>connected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 text-sm">
            <p className="flex items-center gap-2">
              <UserIcon className="size-4" />
              <span className="font-medium">
                {connection?.firstName || connection?.username || "Account"}
              </span>
              {connection?.username ? (
                <span className="text-muted-foreground">
                  @{connection.username}
                </span>
              ) : null}
            </p>
            {connection?.phoneNumber ? (
              <p className="mt-1 text-muted-foreground">
                {connection.phoneNumber}
              </p>
            ) : null}
            {connection?.connectedAt ? (
              <p className="mt-1 text-muted-foreground">
                Connected {new Date(connection.connectedAt).toLocaleString("en-US")}
              </p>
            ) : null}
          </div>
          <IntegrationDangerZone
            resourceLabel="Telegram personal account"
            onDisconnect={disconnectTelegramUserAction}
            successMessage="Telegram account disconnected."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <CardTitle>Connect your personal Telegram</CardTitle>
        <CardDescription>
          Sign in with your Telegram phone number to read and send messages from
          your own account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Automating a personal account is against Telegram&apos;s Terms of
            Service and may lead to the number being limited or banned. Use the
            Bot integration for the safest option.
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-2">
            <Label htmlFor="tg-phone">Phone number</Label>
            <Input
              id="tg-phone"
              type="tel"
              autoComplete="off"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Include the country code. Telegram will send a login code to your
              app.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-2"
              disabled={isLoading || !phone.trim()}
              onClick={() => void handleStart()}
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                "Send code"
              )}
            </Button>
          </div>
        ) : null}

        {step === "code" ? (
          <div className="space-y-2">
            <Label htmlFor="tg-code">Login code</Label>
            <Input
              id="tg-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="12345"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Enter the code Telegram sent to your app for {phone}.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="lg"
                disabled={isLoading || !code.trim()}
                onClick={() => void handleCode()}
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify code"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={isLoading}
                onClick={() => setStep("phone")}
              >
                Back
              </Button>
            </div>
          </div>
        ) : null}

        {step === "password" ? (
          <div className="space-y-2">
            <Label htmlFor="tg-password">Two-factor password</Label>
            <Input
              id="tg-password"
              type="password"
              autoComplete="off"
              placeholder="Your Telegram 2FA password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Your account has two-step verification enabled.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-2"
              disabled={isLoading || !password.trim()}
              onClick={() => void handlePassword()}
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
