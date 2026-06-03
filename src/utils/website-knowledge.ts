import type { WebsiteKnowledgeSync } from "@/types/database.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

export function mapWebsiteKnowledgeSync(
  row: WebsiteKnowledgeSync,
): WebsiteKnowledgeSyncData {
  return {
    id: row.id,
    businessId: row.business_id,
    siteUrl: row.site_url,
    syncStatus: row.sync_status,
    autoSyncEnabled: row.auto_sync_enabled,
    syncIntervalHours: row.sync_interval_hours,
    lastSyncedAt: row.last_synced_at,
    nextSyncAt: row.next_sync_at,
    lastSyncError: row.last_sync_error,
    pagesIndexed: row.pages_indexed,
    entriesSynced: row.entries_synced,
  };
}

export function normalizeWebsiteUrl(url: string): string {
  const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "") || parsed.origin;
}

export function computeNextSyncAt(intervalHours: number): string {
  return new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();
}
