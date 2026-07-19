import { z } from "zod";

import type { MessagingChannel } from "@/types/database.types";

export const CRM_ORDER_STATUSES = [
  "new",
  "in_progress",
  "done",
  "cancelled",
] as const;

export type CrmOrderStatus = (typeof CRM_ORDER_STATUSES)[number];

/** Acquisition / channel sources for orders (legacy `ai` kept for existing rows). */
export const CRM_ORDER_SOURCES = [
  "whatsapp",
  "telegram",
  "instagram",
  "website_forms",
  "website_chat",
  "email",
  "voice",
  "sms",
  "facebook_messenger",
  "manual",
  "ai",
] as const;

export type CrmOrderSource = (typeof CRM_ORDER_SOURCES)[number];

/** Sources managers can pick when adding an order manually. */
export const CRM_ORDER_MANUAL_SOURCES = [
  "whatsapp",
  "telegram",
  "instagram",
  "website_forms",
  "website_chat",
  "email",
  "voice",
  "sms",
  "facebook_messenger",
  "manual",
] as const;

export type CrmOrderManualSource = (typeof CRM_ORDER_MANUAL_SOURCES)[number];

export type CrmOrderPayload = {
  serviceType?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  formName?: string | null;
  sourceUrl?: string | null;
  message?: string | null;
  fields?: Record<string, string | number | boolean>;
  [key: string]: unknown;
};

export type CrmOrderItem = {
  id: string;
  contactId: string | null;
  conversationId: string | null;
  title: string;
  description: string | null;
  source: CrmOrderSource;
  status: CrmOrderStatus;
  amount: number | null;
  currency: string;
  payload: CrmOrderPayload;
  serviceType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmOrderListItem = CrmOrderItem & {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactChannel: MessagingChannel | null;
  customerDisplayName: string;
};

export type CrmOrdersPageData = {
  hasBusiness: boolean;
  orders: CrmOrderListItem[];
  total: number;
  activeStatus: CrmOrderStatus | "all";
  searchQuery: string;
  activeOrderId: string | null;
};

export const updateCrmOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(CRM_ORDER_STATUSES),
});

export const createManualCrmOrderSchema = z
  .object({
    contactId: z.string().uuid().optional().nullable(),
    customerName: z.string().trim().max(200).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    email: z
      .union([z.string().trim().email(), z.literal(""), z.null()])
      .optional()
      .transform((value) => {
        if (!value) {
          return null;
        }
        return value;
      }),
    title: z.string().trim().max(200).optional().nullable(),
    serviceType: z.string().trim().max(120).optional().nullable(),
    description: z.string().trim().max(4000).optional().nullable(),
    amount: z.number().min(0).max(999999999).optional().nullable(),
    source: z.enum(CRM_ORDER_MANUAL_SOURCES).default("manual"),
    customFields: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .default({}),
  })
  .superRefine((value, ctx) => {
    const hasValue = [
      value.customerName,
      value.phone,
      value.email,
      value.title,
      value.serviceType,
      value.description,
      value.amount != null ? String(value.amount) : null,
      ...Object.values(value.customFields ?? {}).map((entry) =>
        entry == null ? "" : String(entry),
      ),
    ].some((entry) => typeof entry === "string" && entry.trim().length > 0);

    if (!hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fill at least one field to create an order.",
      });
    }
  });

export type UpdateCrmOrderStatusInput = z.infer<
  typeof updateCrmOrderStatusSchema
>;
export type CreateManualCrmOrderInput = z.infer<
  typeof createManualCrmOrderSchema
>;

export type CrmOrderActionResult =
  | { success: true; data?: { orderId: string } }
  | { success: false; error: { code: string; message: string } };

export type CreateCrmOrderInput = {
  businessId: string;
  contactId?: string | null;
  conversationId?: string | null;
  title?: string | null;
  description?: string | null;
  source: CrmOrderSource;
  amount?: number | null;
  currency?: string;
  payload?: CrmOrderPayload;
};

export function toCrmOrderSource(
  channel: string | null | undefined,
): CrmOrderSource {
  if (channel && CRM_ORDER_SOURCES.includes(channel as CrmOrderSource)) {
    return channel as CrmOrderSource;
  }
  return "manual";
}
