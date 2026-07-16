import { z } from "zod";

export const COLLECTION_NICHES = [
  "generic",
  "hotel",
  "it_agency",
  "clinic",
  "real_estate",
  "salon",
  "restaurant",
  "auto_service",
  "spa",
  "dentist",
  "barbershop",
] as const;

export type CollectionNiche = (typeof COLLECTION_NICHES)[number];

export const DATA_COLLECTION_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "date",
  "datetime",
  "select",
  "checkbox",
  "url",
] as const;

export type DataCollectionFieldType =
  (typeof DATA_COLLECTION_FIELD_TYPES)[number];

export const DATA_COLLECTION_CRM_MAPS = [
  "name",
  "email",
  "phone",
  "company",
  "location",
  "dealValue",
  "expectedCloseDate",
  "custom",
] as const;

export type DataCollectionCrmMap = (typeof DATA_COLLECTION_CRM_MAPS)[number];

export const dataCollectionFieldSchema = z.object({
  id: z.string().trim().min(1).max(64),
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Invalid field key."),
  label: z.string().trim().min(1).max(120),
  type: z.enum(DATA_COLLECTION_FIELD_TYPES),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  crmMap: z.enum(DATA_COLLECTION_CRM_MAPS).default("custom"),
});

export type DataCollectionField = z.infer<typeof dataCollectionFieldSchema>;

export const dataCollectionFieldsSchema = z
  .array(dataCollectionFieldSchema)
  .max(40);

export function isCollectionNiche(value: unknown): value is CollectionNiche {
  return (
    typeof value === "string" &&
    (COLLECTION_NICHES as readonly string[]).includes(value)
  );
}

export function parseDataCollectionFields(raw: unknown): DataCollectionField[] {
  const parsed = dataCollectionFieldsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export type ContactCollectionSnapshot = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  location?: string | null;
  dealValue?: number | null;
  expectedCloseDate?: string | null;
  /** contacts.custom_fields.collection map */
  collection?: Record<string, string> | null;
  customFields?: Record<string, unknown> | null;
};

export type CollectionGapResult = {
  niche: CollectionNiche;
  fields: DataCollectionField[];
  known: Record<string, string>;
  missingRequired: DataCollectionField[];
  missingOptional: DataCollectionField[];
  requiredComplete: boolean;
  completionRatio: number;
};

export const COLLECTION_CUSTOM_FIELDS_KEY = "collection";
