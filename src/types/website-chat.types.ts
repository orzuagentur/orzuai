import { z } from "zod";

export type WebsiteChatConnectionData = {
  id: string;
  businessId: string;
  status: "connected" | "pending" | "disconnected";
  siteName: string | null;
  siteUrl: string | null;
  welcomeMessage: string;
  primaryColor: string;
  widgetToken: string;
  embedScriptUrl: string;
  embedSnippet: string;
};

export type WebsiteChatConnectConfig = {
  isConfigured: boolean;
  widgetScriptBaseUrl: string;
};

export type EnableWebsiteChatResult =
  | { success: true; connection: WebsiteChatConnectionData }
  | { success: false; error: { code: string; message: string } };

export const updateWebsiteChatSettingsSchema = z.object({
  siteName: z.string().max(120).optional().nullable(),
  siteUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  welcomeMessage: z.string().min(1).max(500),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type UpdateWebsiteChatSettingsInput = z.infer<
  typeof updateWebsiteChatSettingsSchema
>;

export const websiteChatMessageSchema = z.object({
  visitorId: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
  message: z.string().min(1).max(4000),
});

export type WebsiteChatMessageInput = z.infer<typeof websiteChatMessageSchema>;
