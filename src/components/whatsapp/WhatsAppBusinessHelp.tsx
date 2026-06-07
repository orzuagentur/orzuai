import { MessageCircleIcon } from "lucide-react";

import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";

export function WhatsAppBusinessHelp() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
      <div className="flex items-start gap-3">
        <MessageCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">{WHATSAPP_MESSAGES.whatsappBusinessHelpTitle}</p>
          <p className="text-muted-foreground">{WHATSAPP_MESSAGES.whatsappBusinessRequired}</p>
        </div>
      </div>
    </div>
  );
}
