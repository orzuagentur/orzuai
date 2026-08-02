import type { Metadata } from "next";

import { TelegramUserPanel } from "@/components/telegram/TelegramUserPanel";
import { isTelegramMtprotoConfigured } from "@/lib/telegram/mtproto";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getTelegramUserConnection } from "@/services/telegram-user.service";

export const metadata: Metadata = {
  title: "Personal Telegram",
};

export default async function TelegramPersonalPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const connection = business
    ? await getTelegramUserConnection(business.id)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Personal Telegram
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your own Telegram account to read and send direct messages
          from the inbox.
        </p>
      </div>

      <TelegramUserPanel
        connection={connection}
        hasBusiness={Boolean(business)}
        isConfigured={isTelegramMtprotoConfigured()}
      />
    </div>
  );
}
