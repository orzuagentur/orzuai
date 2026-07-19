import { z } from "zod";

/** Built-in keys that map to order columns / known payload keys. */
export const ORDER_FORM_BUILTIN_KEYS = [
  "customerName",
  "phone",
  "email",
  "title",
  "serviceType",
  "description",
  "amount",
  "source",
] as const;

export type OrderFormBuiltinKey = (typeof ORDER_FORM_BUILTIN_KEYS)[number];

/**
 * Built-in fields that may use ready-made option lists.
 * Contact identity fields (name/phone/email) and free-text details stay free-form.
 * `source` uses fixed CRM enums — not user-editable options.
 */
export const ORDER_FORM_OPTIONABLE_BUILTIN_KEYS = [
  "serviceType",
  "amount",
  "title",
] as const satisfies readonly OrderFormBuiltinKey[];

export type OrderFormOptionableBuiltinKey =
  (typeof ORDER_FORM_OPTIONABLE_BUILTIN_KEYS)[number];

export const ORDER_FORM_KB_IMPORT_KINDS = ["services", "prices"] as const;
export type OrderFormKbImportKind = (typeof ORDER_FORM_KB_IMPORT_KINDS)[number];

export const ORDER_FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "select",
] as const;

export type OrderFormFieldType = (typeof ORDER_FORM_FIELD_TYPES)[number];

export const ORDER_FORM_OPTION_MAX = 100;
export const ORDER_FORM_OPTION_VALUE_MAX = 120;

export const orderFormFieldSchema = z.object({
  id: z.string().trim().min(1).max(64),
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Invalid field key."),
  label: z.string().trim().min(1).max(120),
  type: z.enum(ORDER_FORM_FIELD_TYPES),
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  builtIn: z.boolean().default(false),
  options: z
    .array(z.string().trim().min(1).max(ORDER_FORM_OPTION_VALUE_MAX))
    .max(ORDER_FORM_OPTION_MAX)
    .optional(),
});

export type OrderFormField = z.infer<typeof orderFormFieldSchema>;

export const orderFormFieldsSchema = z.array(orderFormFieldSchema).max(40);

export const ORDER_FORM_FIELD_CATALOG: ReadonlyArray<{
  key: OrderFormBuiltinKey;
  label: string;
  type: OrderFormFieldType;
}> = [
  { key: "customerName", label: "Customer name", type: "text" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "title", label: "What they want", type: "text" },
  { key: "serviceType", label: "Service type", type: "text" },
  { key: "description", label: "Details", type: "textarea" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "source", label: "Source", type: "select" },
];

export function createDefaultOrderFormFields(): OrderFormField[] {
  return ORDER_FORM_FIELD_CATALOG.map((entry) => ({
    id: `builtin_${entry.key}`,
    key: entry.key,
    label: entry.label,
    type: entry.type,
    required: false,
    enabled: true,
    builtIn: true,
  }));
}

export function parseOrderFormFields(raw: unknown): OrderFormField[] {
  const parsed = orderFormFieldsSchema.safeParse(raw);
  if (!parsed.success || parsed.data.length === 0) {
    return createDefaultOrderFormFields();
  }
  return parsed.data;
}

export function getEnabledOrderFormFields(
  fields: OrderFormField[],
): OrderFormField[] {
  return fields.filter((field) => field.enabled);
}

export function isOrderFormBuiltinKey(key: string): key is OrderFormBuiltinKey {
  return (ORDER_FORM_BUILTIN_KEYS as readonly string[]).includes(key);
}

export function isOrderFormOptionableBuiltinKey(
  key: string,
): key is OrderFormOptionableBuiltinKey {
  return (ORDER_FORM_OPTIONABLE_BUILTIN_KEYS as readonly string[]).includes(key);
}

/** Whether this field can store a ready-made options list in settings. */
export function fieldSupportsOptions(field: OrderFormField): boolean {
  if (!field.builtIn) return true;
  return isOrderFormOptionableBuiltinKey(field.key);
}

/** Builtin keys that can import options from the knowledge base. */
export function getKbImportKindForField(
  field: OrderFormField,
): OrderFormKbImportKind | null {
  if (!field.builtIn) return null;
  if (field.key === "serviceType" || field.key === "title") return "services";
  if (field.key === "amount") return "prices";
  return null;
}

export function normalizeOrderFormOptions(
  options: readonly string[] | undefined | null,
): string[] {
  if (!options?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of options) {
    const value = raw.trim().slice(0, ORDER_FORM_OPTION_VALUE_MAX);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= ORDER_FORM_OPTION_MAX) break;
  }
  return result;
}

export function mergeOrderFormOptions(
  existing: readonly string[] | undefined | null,
  incoming: readonly string[],
): string[] {
  return normalizeOrderFormOptions([...(existing ?? []), ...incoming]);
}

export function getFieldSelectableOptions(
  field: OrderFormField,
): string[] | null {
  if (!fieldSupportsOptions(field)) return null;
  const options = normalizeOrderFormOptions(field.options);
  return options.length > 0 ? options : null;
}

export function formatOrderFormFieldPromptLine(field: OrderFormField): string {
  const flags = [
    field.type,
    field.required ? "REQUIRED" : "optional",
  ];
  const options = getFieldSelectableOptions(field);
  const optionsText = options
    ? `; options: ${options.map((option) => `"${option}"`).join(", ")}`
    : "";
  return `- ${field.key} (${field.label}, ${flags.join(", ")}${optionsText})`;
}

export function resolveOrderTitle(input: {
  title?: string | null;
  customerName?: string | null;
  serviceType?: string | null;
  description?: string | null;
}): string {
  const title = input.title?.trim();
  if (title) return title.slice(0, 200);

  const customerName = input.customerName?.trim();
  if (customerName) return `Order — ${customerName}`.slice(0, 200);

  const serviceType = input.serviceType?.trim();
  if (serviceType) return serviceType.slice(0, 200);

  const description = input.description?.trim();
  if (description) return description.slice(0, 200);

  return "Order";
}
