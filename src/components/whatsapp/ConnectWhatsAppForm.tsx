"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useConnectWhatsApp } from "@/hooks/use-connect-whatsapp";

type ConnectWhatsAppFormProps = {
  onConnected: (connectionId: string) => void;
};

export function ConnectWhatsAppForm({ onConnected }: ConnectWhatsAppFormProps) {
  const { connect, isLoading } = useConnectWhatsApp({
    onSuccess: onConnected,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    await connect({
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      metaPhoneNumberId: String(formData.get("metaPhoneNumberId") ?? ""),
      metaAccessToken: String(formData.get("metaAccessToken") ?? ""),
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
      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number">WhatsApp Phone Number</Label>
        <Input
          id="whatsapp-phone-number"
          name="phoneNumber"
          placeholder="+15551234567"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number-id">Meta Phone Number ID</Label>
        <Input
          id="whatsapp-phone-number-id"
          name="metaPhoneNumberId"
          placeholder="From Meta Developer Console"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-access-token">Meta Access Token</Label>
        <Input
          id="whatsapp-access-token"
          name="metaAccessToken"
          type="password"
          placeholder="Permanent or temporary access token"
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          WHATSAPP_MESSAGES.connectTitle
        )}
      </Button>
    </form>
  );
}
