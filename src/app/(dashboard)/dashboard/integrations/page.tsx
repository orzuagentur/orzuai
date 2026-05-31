import { WhatsAppIntegrationPanel } from "@/components/whatsapp/WhatsAppIntegrationPanel";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { getAppUrl } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getWhatsAppConnection } from "@/services/whatsapp.service";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const connection = business ? await getWhatsAppConnection(business.id) : null;
  const webhookUrl = new URL("/api/webhooks/whatsapp", getAppUrl()).toString();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {WHATSAPP_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {WHATSAPP_MESSAGES.pageDescription}
        </p>
      </div>

      <WhatsAppIntegrationPanel
        connection={connection}
        hasBusiness={Boolean(business)}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
