import { MessageCircleIcon } from "lucide-react";

import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";

export function WhatsAppBusinessHelp() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <MessageCircleIcon className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">{WHATSAPP_MESSAGES.whatsappBusinessHelpTitle}</p>
          <p className="leading-6 text-muted-foreground">
            {WHATSAPP_MESSAGES.whatsappBusinessRequired}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Install WhatsApp Business on your phone.</li>
            <li>Set up your business profile in the app.</li>
            <li>Return here and click Connect WhatsApp again.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
