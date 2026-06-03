import { z } from "zod";

export const WEBSITE_FORM_FOLLOW_UP_CHANNELS = [
  "whatsapp",
  "telegram",
  "email",
  "none",
] as const;

export type WebsiteFormFollowUpChannel =
  (typeof WEBSITE_FORM_FOLLOW_UP_CHANNELS)[number];

export const websiteFormSubmissionSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    message: z.string().trim().optional(),
    form_name: z.string().trim().optional(),
    formName: z.string().trim().optional(),
    source_url: z.string().trim().url().optional(),
    sourceUrl: z.string().trim().url().optional(),
    fields: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.name ||
          data.email ||
          data.phone ||
          data.message ||
          (data.fields && Object.keys(data.fields).length > 0),
      ),
    { message: "Provide at least name, email, phone, message, or fields." },
  );

export type WebsiteFormSubmissionInput = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  formName?: string;
  sourceUrl?: string;
  fields?: Record<string, string | number | boolean>;
};

export type WebsiteFormConnectionData = {
  id: string;
  businessId: string;
  webhookUrl: string;
  apiKeyPrefix: string;
  siteName: string | null;
  siteUrl: string | null;
  status: "connected" | "disconnected" | "pending";
  autoFollowUpEnabled: boolean;
  followUpChannel: WebsiteFormFollowUpChannel;
  connectedAt: string | null;
  lastSubmissionAt: string | null;
};

export type WebsiteFormConnectConfig = {
  isConfigured: boolean;
  webhookBaseUrl: string;
};

export type EnableWebsiteFormsResult =
  | {
      success: true;
      data: WebsiteFormConnectionData & { apiKey: string };
    }
  | {
      success: false;
      error: { code: string; message: string };
    };

export type UpdateWebsiteFormsSettingsInput = {
  siteName?: string;
  siteUrl?: string;
  autoFollowUpEnabled?: boolean;
  followUpChannel?: WebsiteFormFollowUpChannel;
};

export type RegenerateWebsiteFormApiKeyResult =
  | { success: true; data: { apiKey: string; apiKeyPrefix: string } }
  | { success: false; error: { code: string; message: string } };

export function parseWebsiteFormSubmissionPayload(
  body: unknown,
): WebsiteFormSubmissionInput | null {
  const parsed = websiteFormSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;

  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    formName: data.formName ?? data.form_name,
    sourceUrl: data.sourceUrl ?? data.source_url,
    fields: data.fields,
  };
}
