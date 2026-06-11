import { z } from "zod";

import { DEAL_CURRENCIES } from "@/lib/deal-currency";
import { PIPELINE_STAGES } from "./contact.types";

const dealCurrencyCodes = DEAL_CURRENCIES.map((entry) => entry.code) as [
  string,
  ...string[],
];

export const CRM_DEAL_STATUSES = ["open", "won", "lost"] as const;

export type CrmDealStatus = (typeof CRM_DEAL_STATUSES)[number];

export type CrmDealItem = {
  id: string;
  contactId: string;
  title: string;
  value: number | null;
  currency: string;
  stage: (typeof PIPELINE_STAGES)[number];
  expectedCloseDate: string | null;
  status: CrmDealStatus;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
};

export const createCrmDealSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  value: z.number().min(0).max(999999999).optional().nullable(),
  currency: z.enum(dealCurrencyCodes).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  expectedCloseDate: z.string().trim().max(32).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const updateCrmDealSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  value: z.number().min(0).max(999999999).optional().nullable(),
  currency: z.enum(dealCurrencyCodes).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  expectedCloseDate: z.string().trim().max(32).optional().nullable(),
  status: z.enum(CRM_DEAL_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const deleteCrmDealSchema = z.object({
  dealId: z.string().uuid(),
});

export type CreateCrmDealInput = z.infer<typeof createCrmDealSchema>;
export type UpdateCrmDealInput = z.infer<typeof updateCrmDealSchema>;
export type DeleteCrmDealInput = z.infer<typeof deleteCrmDealSchema>;

export type CrmDealActionResult =
  | { success: true; data?: { dealId: string } }
  | { success: false; error: { code: string; message: string } };
