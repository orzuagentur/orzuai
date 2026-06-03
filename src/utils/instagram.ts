import type { InstagramConnection } from "@/types/database.types";
import type { InstagramConnectionData } from "@/types/instagram.types";

export function mapInstagramConnection(
  connection: InstagramConnection,
): InstagramConnectionData {
  return {
    id: connection.id,
    businessId: connection.business_id,
    username: connection.instagram_username,
    status: connection.instagram_status,
    connectedAt: connection.connected_at,
    lastSyncedAt: connection.last_synced_at,
    createdAt: connection.created_at,
  };
}
