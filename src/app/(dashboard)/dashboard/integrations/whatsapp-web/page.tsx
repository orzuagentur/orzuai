import type { Metadata } from "next";

import { WhatsAppWebPanel } from "@/components/whatsapp/WhatsAppWebPanel";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getWhatsAppWebConnection } from "@/services/whatsapp-web.service";

export const metadata: Metadata = {
  title: "WhatsApp via QR",
};

export default async function WhatsAppWebPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const connection = business
    ? await getWhatsAppWebConnection(business.id)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          WhatsApp via QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Link your personal WhatsApp account (WhatsApp Web style) to read and
          send messages from the inbox.
        </p>
      </div>

      <WhatsAppWebPanel
        connection={connection}
        businessId={business?.id ?? null}
        hasBusiness={Boolean(business)}
      />
    </div>
  );
}
