import { randomBytes } from "node:crypto";

import type { WebsiteChatConnectionData } from "@/types/website-chat.types";

type WebsiteChatConnectionRow = {
  id: string;
  business_id: string;
  widget_token: string;
  connection_status: "connected" | "pending" | "disconnected";
  site_name: string | null;
  site_url: string | null;
  welcome_message: string;
  primary_color: string;
};

export function generateWebsiteChatWidgetToken(): string {
  return randomBytes(24).toString("hex");
}

export function buildWebsiteChatEmbedSnippet(
  scriptUrl: string,
  widgetToken: string,
): string {
  return `<script src="${scriptUrl}" data-widget-token="${widgetToken}" async></script>`;
}

export function mapWebsiteChatConnection(
  row: WebsiteChatConnectionRow,
  scriptBaseUrl: string,
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
    embedScriptUrl: scriptBaseUrl,
    embedSnippet: buildWebsiteChatEmbedSnippet(scriptBaseUrl, row.widget_token),
  };
}
