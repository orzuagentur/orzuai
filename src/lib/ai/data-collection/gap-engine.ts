import {
  COLLECTION_CUSTOM_FIELDS_KEY,
  type CollectionGapResult,
  type CollectionNiche,
  type ContactCollectionSnapshot,
  type DataCollectionField,
} from "./types";
import { resolveDataCollectionFields } from "./presets";

function asTrimmedString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function readCollectionMap(
  contact: ContactCollectionSnapshot | null | undefined,
): Record<string, string> {
  const fromExplicit = contact?.collection;
  if (fromExplicit && typeof fromExplicit === "object") {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(fromExplicit)) {
      const text = asTrimmedString(value);
      if (text) out[key] = text;
    }
    return out;
  }

  const custom = contact?.customFields;
  if (!custom || typeof custom !== "object") {
    return {};
  }

  const nested = custom[COLLECTION_CUSTOM_FIELDS_KEY];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(nested as Record<string, unknown>)) {
    const text = asTrimmedString(value);
    if (text) out[key] = text;
  }
  return out;
}

function knownValueForField(
  field: DataCollectionField,
  contact: ContactCollectionSnapshot | null | undefined,
  collection: Record<string, string>,
  hints?: Record<string, string> | null,
): string {
  const fromHint = asTrimmedString(hints?.[field.key]);
  if (fromHint) return fromHint;

  const fromCollection = asTrimmedString(collection[field.key]);
  if (fromCollection) return fromCollection;

  switch (field.crmMap) {
    case "name":
      return asTrimmedString(contact?.name);
    case "email":
      return asTrimmedString(contact?.email);
    case "phone":
      return asTrimmedString(contact?.phone);
    case "company":
      return asTrimmedString(contact?.company);
    case "location":
      return asTrimmedString(contact?.location);
    case "dealValue":
      return contact?.dealValue != null && Number.isFinite(contact.dealValue)
        ? String(contact.dealValue)
        : "";
    case "expectedCloseDate":
      return asTrimmedString(contact?.expectedCloseDate);
    default:
      return "";
  }
}

export function computeCollectionGaps(input: {
  niche: CollectionNiche;
  storedFields: DataCollectionField[];
  contact?: ContactCollectionSnapshot | null;
  hints?: Record<string, string> | null;
}): CollectionGapResult {
  const fields = resolveDataCollectionFields({
    niche: input.niche,
    storedFields: input.storedFields,
  });
  const collection = readCollectionMap(input.contact);
  const known: Record<string, string> = {};
  const missingRequired: DataCollectionField[] = [];
  const missingOptional: DataCollectionField[] = [];

  for (const field of fields) {
    const value = knownValueForField(
      field,
      input.contact,
      collection,
      input.hints,
    );
    if (value) {
      known[field.key] = value;
      continue;
    }
    if (field.required) {
      missingRequired.push(field);
    } else {
      missingOptional.push(field);
    }
  }

  const requiredTotal = fields.filter((f) => f.required).length;
  const requiredKnown = requiredTotal - missingRequired.length;
  const completionRatio =
    requiredTotal === 0 ? 1 : Math.max(0, Math.min(1, requiredKnown / requiredTotal));

  return {
    niche: input.niche,
    fields,
    known,
    missingRequired,
    missingOptional,
    requiredComplete: missingRequired.length === 0,
    completionRatio,
  };
}

export function mergeCollectionAnswersIntoCustomFields(
  existingCustomFields: Record<string, unknown> | null | undefined,
  answers: Record<string, string>,
): Record<string, unknown> {
  const base =
    existingCustomFields && typeof existingCustomFields === "object"
      ? { ...existingCustomFields }
      : {};
  const prev =
    base[COLLECTION_CUSTOM_FIELDS_KEY] &&
    typeof base[COLLECTION_CUSTOM_FIELDS_KEY] === "object" &&
    !Array.isArray(base[COLLECTION_CUSTOM_FIELDS_KEY])
      ? {
          ...(base[COLLECTION_CUSTOM_FIELDS_KEY] as Record<string, unknown>),
        }
      : {};

  for (const [key, value] of Object.entries(answers)) {
    const text = asTrimmedString(value);
    if (text) {
      prev[key] = text;
    }
  }

  base[COLLECTION_CUSTOM_FIELDS_KEY] = prev;
  return base;
}

export function mapCollectedAnswersToContactUpdates(
  fields: DataCollectionField[],
  answers: Record<string, string>,
): {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  dealValue?: number;
  expectedCloseDate?: string;
  collectionAnswers: Record<string, string>;
} {
  const collectionAnswers: Record<string, string> = {};
  const updates: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    location?: string;
    dealValue?: number;
    expectedCloseDate?: string;
    collectionAnswers: Record<string, string>;
  } = { collectionAnswers };

  const byKey = new Map(fields.map((f) => [f.key, f]));

  for (const [key, raw] of Object.entries(answers)) {
    const text = asTrimmedString(raw);
    if (!text) continue;
    collectionAnswers[key] = text;
    const field = byKey.get(key);
    if (!field) continue;

    switch (field.crmMap) {
      case "name":
        updates.name = text;
        break;
      case "email":
        updates.email = text;
        break;
      case "phone":
        updates.phone = text;
        break;
      case "company":
        updates.company = text;
        break;
      case "location":
        updates.location = text;
        break;
      case "dealValue": {
        const num = Number(text.replace(/[^\d.]/g, ""));
        if (Number.isFinite(num) && num >= 0) {
          updates.dealValue = num;
        }
        break;
      }
      case "expectedCloseDate":
        updates.expectedCloseDate = text;
        break;
      default:
        break;
    }
  }

  return updates;
}
