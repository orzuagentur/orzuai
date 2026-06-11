import { z } from "zod";

export const ADDITIONAL_CONTACT_TYPES = ["phone", "email"] as const;

export type AdditionalContactType = (typeof ADDITIONAL_CONTACT_TYPES)[number];

export type AdditionalContactEntry = {
  id: string;
  type: AdditionalContactType;
  value: string;
  label: string;
};

const additionalContactEntrySchema = z.object({
  id: z.string().trim().min(1).max(64),
  type: z.enum(ADDITIONAL_CONTACT_TYPES),
  value: z.string().trim().min(1).max(320),
  label: z.string().trim().max(80).optional().default(""),
});

export const additionalContactsSchema = z
  .array(additionalContactEntrySchema)
  .max(20);

export function parseAdditionalContacts(
  value: unknown,
): AdditionalContactEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: AdditionalContactEntry[] = [];

  for (const entry of value) {
    const result = additionalContactEntrySchema.safeParse(entry);

    if (result.success) {
      parsed.push({
        id: result.data.id,
        type: result.data.type,
        value: result.data.value,
        label: result.data.label?.trim() ?? "",
      });
    }
  }

  return parsed;
}

export function createAdditionalContactId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `contact-${Date.now()}`;
}
