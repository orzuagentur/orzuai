import { WhatsAppIntegrationPanel } from "@/components/whatsapp/WhatsAppIntegrationPanel";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  getWhatsAppConnection,
  getWhatsAppEmbeddedSignupConfig,
} from "@/services/whatsapp.service";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const [connection, embeddedSignupConfig] = await Promise.all([
    business ? getWhatsAppConnection(business.id) : Promise.resolve(null),
    getWhatsAppEmbeddedSignupConfig(),
  ]);

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
        embeddedSignupConfig={embeddedSignupConfig}
      />
    </div>
  );
}
