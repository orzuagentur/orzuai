import { z } from "zod";

export const CUSTOMER_INTENTS = [
  "general",
  "booking",
  "sales",
  "support",
  "registration",
  "none",
] as const;

export type CustomerIntent = (typeof CUSTOMER_INTENTS)[number];

export const intentClassificationSchema = z.object({
  intent: z.enum(CUSTOMER_INTENTS),
  confidence: z.number().min(0).max(1),
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;

export type AgentRoutingMethod = "intent" | "keyword" | "none";
