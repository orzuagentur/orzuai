import { z } from "zod";

import {
  WEBSITE_CHAT_LAUNCHER_ICONS,
  WEBSITE_CHAT_POSITIONS,
} from "@/features/website-chat/widget-appearance";

export type WebsiteChatConnectionData = {
  id: string;
  businessId: string;
  status: "connected" | "pending" | "disconnected";
  siteName: string | null;
  siteUrl: string | null;
  widgetTitle: string;
  welcomeMessage: string;
  primaryColor: string;
  launcherIcon: (typeof WEBSITE_CHAT_LAUNCHER_ICONS)[number];
  position: (typeof WEBSITE_CHAT_POSITIONS)[number];
  widgetToken: string;
  apiKeyPrefix: string;
  connectedAt: string | null;
  lastSeenAt: string | null;
  embedScriptUrl: string;
  embedSnippet: string;
};

export type WebsiteChatConnectConfig = {
  isConfigured: boolean;
  widgetScriptBaseUrl: string;
};

export type EnableWebsiteChatResult =
  | { success: true; connection: WebsiteChatConnectionData; siteKey?: string }
  | { success: false; error: { code: string; message: string } };

export type RegenerateWebsiteChatApiKeyResult =
  | { success: true; data: { siteKey: string; apiKeyPrefix: string } }
  | { success: false; error: { code: string; message: string } };

export const websiteChatAppearanceSchema = z.object({
  widgetTitle: z.string().trim().min(1).max(80),
  welcomeMessage: z.string().trim().min(1).max(500),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  launcherIcon: z.enum(WEBSITE_CHAT_LAUNCHER_ICONS),
  position: z.enum(WEBSITE_CHAT_POSITIONS),
});

export const updateWebsiteChatSettingsSchema = websiteChatAppearanceSchema;

export type UpdateWebsiteChatSettingsInput = z.infer<
  typeof updateWebsiteChatSettingsSchema
>;

export type EnableWebsiteChatInput = UpdateWebsiteChatSettingsInput;

export const websiteChatMessageSchema = z.object({
  visitorId: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(4000),
});

export type WebsiteChatMessageInput = z.infer<typeof websiteChatMessageSchema>;

export const websiteChatMessagesQuerySchema = z.object({
  visitorId: z.string().min(8).max(128),
  after: z.string().datetime().optional(),
});

export type WebsiteChatWidgetMessage = {
  id: string;
  content: string;
  senderType: "client" | "ai" | "user";
  createdAt: string;
};
