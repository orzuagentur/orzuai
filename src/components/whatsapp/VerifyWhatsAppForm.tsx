"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useVerifyWhatsApp } from "@/hooks/use-verify-whatsapp";

type VerifyWhatsAppFormProps = {
  connectionId: string;
  onVerified: () => void;
};

export function VerifyWhatsAppForm({
  connectionId,
  onVerified,
}: VerifyWhatsAppFormProps) {
  const { verify, isLoading } = useVerifyWhatsApp({
    onSuccess: onVerified,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    await verify({
      connectionId,
      verificationCode: String(formData.get("verificationCode") ?? ""),
    });
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-4"
      noValidate
    >
      <p className="text-sm text-muted-foreground">
        {WHATSAPP_MESSAGES.verifyDescription}
      </p>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-verification-code">Verification Code</Label>
        <Input
          id="whatsapp-verification-code"
          name="verificationCode"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify number"
        )}
      </Button>
    </form>
  );
}
