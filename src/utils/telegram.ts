import type { TelegramConnection } from "@/types/database.types";
import type { TelegramConnectionData } from "@/types/telegram.types";

export function mapTelegramConnection(
  connection: TelegramConnection,
): TelegramConnectionData {
  return {
    id: connection.id,
    businessId: connection.business_id,
    botUsername: connection.bot_username,
    status: connection.telegram_status,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
    createdAt: connection.created_at,
  };
}
