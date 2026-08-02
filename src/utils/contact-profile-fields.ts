import { z } from "zod";

export type ContactProfileFieldEntry = {
  id: string;
  label: string;
  iconKey: string;
  value: string;
};

export const contactProfileFieldEntrySchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  iconKey: z.string().trim().min(1).max(64),
  value: z.string().trim().max(500),
});

export const contactProfileFieldsSchema = z
  .array(contactProfileFieldEntrySchema)
  .max(30);

export function createContactProfileFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `pf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseContactProfileFields(
  value: unknown,
): ContactProfileFieldEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed = contactProfileFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
