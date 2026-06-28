export type BookingFormFieldType =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "text"
  | "textarea"
  | "number";

export type BookingFormField = {
  id: string;
  key: string;
  label: string;
  type: BookingFormFieldType;
  required: boolean;
  system?: boolean;
};

export const DEFAULT_BOOKING_FORM_FIELDS: BookingFormField[] = [
  {
    id: "first_name",
    key: "firstName",
    label: "First name",
    type: "first_name",
    required: true,
    system: true,
  },
  {
    id: "last_name",
    key: "lastName",
    label: "Last name",
    type: "last_name",
    required: true,
    system: true,
  },
  {
    id: "email",
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    system: true,
  },
];

export function parseBookingFormFields(raw: unknown): BookingFormField[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_BOOKING_FORM_FIELDS;
  }

  const parsed: BookingFormField[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const id = String(record.id ?? "");
    const key = String(record.key ?? "");
    const label = String(record.label ?? "").trim();
    const type = String(record.type ?? "text") as BookingFormFieldType;

    if (!id || !key || !label) continue;

    parsed.push({
      id,
      key,
      label,
      type,
      required: Boolean(record.required),
      system: Boolean(record.system),
    });
  }

  return parsed.length > 0 ? parsed : DEFAULT_BOOKING_FORM_FIELDS;
}

export function cloneBookingFormFields(fields: BookingFormField[]): BookingFormField[] {
  return fields.map((field) => ({ ...field }));
}

export function createCustomBookingFormField(label: string): BookingFormField {
  const id = crypto.randomUUID();

  return {
    id,
    key: `field_${id.replace(/-/g, "").slice(0, 8)}`,
    label: label.trim() || "Custom field",
    type: "text",
    required: false,
    system: false,
  };
}

export function validateBookingFormAnswers(
  fields: BookingFormField[],
  answers: Record<string, string>,
): { valid: boolean; message?: string } {
  for (const field of fields) {
    const value = answers[field.key]?.trim() ?? "";

    if (field.required && !value) {
      return { valid: false, message: `${field.label} is required.` };
    }

    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, message: "Enter a valid email address." };
    }

    if (field.type === "number" && value && !/^\d+$/.test(value)) {
      return { valid: false, message: `${field.label} must be a number.` };
    }
  }

  return { valid: true };
}

export function formatBookingAnswersForDescription(
  fields: BookingFormField[],
  answers: Record<string, string>,
): string[] {
  return fields
    .map((field) => {
      const value = answers[field.key]?.trim();
      return value ? `${field.label}: ${value}` : null;
    })
    .filter((line): line is string => Boolean(line));
}
