import type {
  CollectionNiche,
  DataCollectionField,
  DataCollectionFieldType,
} from "./types";

function field(
  id: string,
  key: string,
  label: string,
  type: DataCollectionFieldType,
  required: boolean,
  crmMap: DataCollectionField["crmMap"] = "custom",
  options?: string[],
): DataCollectionField {
  return {
    id,
    key,
    label,
    type,
    required,
    crmMap,
    ...(options ? { options } : {}),
  };
}

const CONTACT_CORE: DataCollectionField[] = [
  field("name", "name", "Full name", "text", true, "name"),
  field("phone", "phone", "Phone", "phone", true, "phone"),
  field("email", "email", "Email", "email", false, "email"),
];

export const COLLECTION_NICHE_LABELS: Record<CollectionNiche, string> = {
  generic: "General business",
  hotel: "Hotel / hospitality",
  it_agency: "IT agency / software",
  clinic: "Clinic / medical",
  real_estate: "Real estate",
  salon: "Salon / beauty",
  restaurant: "Restaurant",
  auto_service: "Auto service",
  spa: "Spa / wellness",
  dentist: "Dentist",
  barbershop: "Barbershop",
};

const PRESETS: Record<CollectionNiche, DataCollectionField[]> = {
  generic: [
    ...CONTACT_CORE,
    field("company", "company", "Company", "text", false, "company"),
    field("need", "need", "What they need", "textarea", true),
    field("budget", "budget", "Budget", "text", false),
    field("timeline", "timeline", "Timeline", "text", false),
  ],
  hotel: [
    ...CONTACT_CORE,
    field("checkIn", "checkIn", "Check-in date", "date", true),
    field("checkOut", "checkOut", "Check-out date", "date", true),
    field("guestCount", "guestCount", "Number of guests", "number", true),
    field("wishes", "wishes", "Special requests", "textarea", false),
  ],
  it_agency: [
    ...CONTACT_CORE,
    field("company", "company", "Company", "text", true, "company"),
    field("projectType", "projectType", "Project type", "text", true),
    field("budget", "budget", "Budget", "text", true),
    field("timeline", "timeline", "Timeline / deadline", "text", true),
    field("description", "description", "Project description", "textarea", true),
    field("examples", "examples", "Reference examples / links", "url", false),
  ],
  clinic: [
    ...CONTACT_CORE,
    field("service", "service", "Service / procedure", "text", true),
    field("doctor", "doctor", "Preferred doctor", "text", false),
    field("preferredDate", "preferredDate", "Preferred date", "date", true),
  ],
  real_estate: [
    ...CONTACT_CORE,
    field(
      "propertyType",
      "propertyType",
      "Property type",
      "select",
      true,
      "custom",
      ["apartment", "house", "commercial", "land", "other"],
    ),
    field("budget", "budget", "Budget", "text", true),
    field("district", "district", "District / area", "text", true, "location"),
  ],
  salon: [
    ...CONTACT_CORE,
    field("service", "service", "Service", "text", true),
    field("preferredDate", "preferredDate", "Preferred date/time", "datetime", true),
    field("notes", "notes", "Preferences", "textarea", false),
  ],
  restaurant: [
    ...CONTACT_CORE,
    field("partySize", "partySize", "Party size", "number", true),
    field("preferredDate", "preferredDate", "Reservation date/time", "datetime", true),
    field("specialRequests", "specialRequests", "Special requests", "textarea", false),
  ],
  auto_service: [
    ...CONTACT_CORE,
    field("vehicle", "vehicle", "Vehicle make & model", "text", true),
    field("service", "service", "Service needed", "text", true),
    field("preferredDate", "preferredDate", "Preferred date", "date", false),
  ],
  spa: [
    ...CONTACT_CORE,
    field("service", "service", "Treatment / service", "text", true),
    field("preferredDate", "preferredDate", "Preferred date/time", "datetime", true),
  ],
  dentist: [
    ...CONTACT_CORE,
    field("service", "service", "Dental concern / service", "text", true),
    field("preferredDate", "preferredDate", "Preferred date", "date", true),
  ],
  barbershop: [
    ...CONTACT_CORE,
    field("service", "service", "Haircut / service", "text", true),
    field("preferredDate", "preferredDate", "Preferred date/time", "datetime", true),
  ],
};

export function getCollectionNichePreset(
  niche: CollectionNiche,
): DataCollectionField[] {
  return PRESETS[niche].map((item) => ({ ...item, options: item.options ? [...item.options] : undefined }));
}

export function resolveDataCollectionFields(input: {
  niche: CollectionNiche;
  storedFields: DataCollectionField[];
}): DataCollectionField[] {
  if (input.storedFields.length > 0) {
    return input.storedFields;
  }
  return getCollectionNichePreset(input.niche);
}
