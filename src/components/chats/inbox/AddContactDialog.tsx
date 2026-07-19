"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getChannelBadgeLabel } from "@/features/chats/channel-ui";
import {
  startOutboundConversationAction,
  verifyOutboundContactAction,
} from "@/features/chats/actions/add-outbound-contact";
import { CHAT_MESSAGES } from "@/features/chats/constants";

type AddContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationReady: (input: { conversationId: string }) => void;
};

export function AddContactDialog({
  open,
  onOpenChange,
  onConversationReady,
}: AddContactDialogProps) {
  const [contactName, setContactName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedLabel, setVerifiedLabel] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!open) {
      setContactName("");
      setIdentifier("");
      setVerifiedToken(null);
      setVerifiedLabel(null);
      setVerifyMessage(null);
      setIsVerifying(false);
      setIsOpening(false);
    }
  }, [open]);

  const resetVerification = () => {
    setVerifiedToken(null);
    setVerifiedLabel(null);
    setVerifyMessage(null);
  };

  const handleVerify = async () => {
    resetVerification();
    setIsVerifying(true);

    try {
      const result = await verifyOutboundContactAction({
        channel: "email",
        identifier,
        contactName: contactName.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setVerifiedToken(result.verifiedToken);
      setVerifiedLabel(result.displayLabel);
      setVerifyMessage(result.message);
      toast.success(result.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWrite = async () => {
    if (!verifiedToken) {
      toast.error(CHAT_MESSAGES.addContactVerifyRequired);
      return;
    }

    setIsOpening(true);

    try {
      const result = await startOutboundConversationAction({ verifiedToken });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      onConversationReady({ conversationId: result.conversationId });
    } finally {
      setIsOpening(false);
    }
  };

  const identifierTrimmed = identifier.trim();
  const canVerify = identifierTrimmed.length > 0 && !isVerifying && !isOpening;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBrandIcon channel="email" className="size-5" />
            {CHAT_MESSAGES.addContactTitle}
          </DialogTitle>
          <DialogDescription>
            {CHAT_MESSAGES.addContactDescription} ·{" "}
            {getChannelBadgeLabel("email")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="add-contact-name">{CHAT_MESSAGES.addContactNameLabel}</Label>
            <Input
              id="add-contact-name"
              value={contactName}
              onChange={(event) => {
                setContactName(event.target.value);
                resetVerification();
              }}
              placeholder={CHAT_MESSAGES.addContactNamePlaceholder}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-contact-identifier">
              {CHAT_MESSAGES.addContactEmailLabel}
            </Label>
            <Input
              id="add-contact-identifier"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                resetVerification();
              }}
              placeholder={CHAT_MESSAGES.addContactEmailPlaceholder}
              autoComplete="off"
              inputMode="email"
              type="email"
            />
          </div>

          {verifiedLabel ? (
            <p className="rounded-md border border-zinc-500/30 bg-zinc-500/5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
              {verifyMessage ?? CHAT_MESSAGES.addContactVerifySuccess}
              <span className="mt-1 block font-medium">{verifiedLabel}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={!canVerify}
            onClick={() => {
              void handleVerify();
            }}
          >
            {isVerifying ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {CHAT_MESSAGES.addContactVerifying}
              </>
            ) : (
              CHAT_MESSAGES.addContactVerify
            )}
          </Button>
          <Button
            type="button"
            disabled={!verifiedToken || isOpening || isVerifying}
            onClick={() => {
              void handleWrite();
            }}
          >
            {isOpening ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {CHAT_MESSAGES.addContactOpening}
              </>
            ) : (
              CHAT_MESSAGES.addContactWrite
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
