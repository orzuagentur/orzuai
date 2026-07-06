import { randomBytes } from "node:crypto";

import type { WebsiteChatConnectionData } from "@/types/website-chat.types";
import { buildWebsiteChatEmbedSnippet } from "@/utils/website-chat-embed";

type WebsiteChatConnectionRow = {
  id: string;
  business_id: string;
  widget_token: string;
  api_key_hash?: string | null;
  api_key_prefix?: string;
  connection_status: "connected" | "pending" | "disconnected";
  site_name: string | null;
  site_url: string | null;
  welcome_message: string;
  primary_color: string;
  connected_at?: string | null;
  last_seen_at?: string | null;
};

export function generateWebsiteChatWidgetToken(): string {
  return randomBytes(24).toString("hex");
}

export function mapWebsiteChatConnection(
  row: WebsiteChatConnectionRow,
  scriptBaseUrl: string,
  siteKey?: string,
): WebsiteChatConnectionData {
  return {
    id: row.id,
    businessId: row.business_id,
    status: row.connection_status,
    siteName: row.site_name,
    siteUrl: row.site_url,
    welcomeMessage: row.welcome_message,
    primaryColor: row.primary_color,
    widgetToken: row.widget_token,
    apiKeyPrefix: row.api_key_prefix ?? "",
    connectedAt: row.connected_at ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    embedScriptUrl: scriptBaseUrl,
    embedSnippet: buildWebsiteChatEmbedSnippet(
      scriptBaseUrl,
      row.widget_token,
      siteKey,
    ),
  };
}
