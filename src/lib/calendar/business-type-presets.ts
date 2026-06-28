import {
  cloneBookingFormFields,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";
import { getFormFieldsForBusinessType } from "@/lib/calendar/business-type-form-fields";
import {
  createDefaultWeeklySchedule,
  type WeeklySchedule,
} from "@/lib/calendar/weekly-schedule";
import type {
  BusinessBookingType,
  CalendarResourceType,
} from "@/types/business-calendar-resource.types";

export type BusinessTypePresetResource = {
  resourceType: CalendarResourceType;
  name: string;
  description: string;
  capacity: number;
  durationMinutes: number;
};

export type BookingResourceEditorConfig = {
  allowedResourceTypes: CalendarResourceType[];
  defaultResourceType: CalendarResourceType;
  showCapacity: boolean;
  showDuration: boolean;
  resourcesTitle: string;
  resourcesSubtitle: string;
  namePlaceholder: string;
};

export type BusinessTypePreset = {
  type: BusinessBookingType;
  label: string;
  description: string;
  category: string;
  defaultPageTitle: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  advanceBookingDays: number;
  weeklySchedule: WeeklySchedule;
  resources: BusinessTypePresetResource[];
  formFields: BookingFormField[];
  resourceEditor: BookingResourceEditorConfig;
};

function weekdaySchedule(
  days: number[],
  start: string,
  end: string,
): WeeklySchedule {
  const schedule = createDefaultWeeklySchedule();

  for (let day = 0; day <= 6; day += 1) {
    schedule[day] = {
      enabled: days.includes(day),
      start,
      end,
    };
  }

  return schedule;
}

function staffResources(
  names: string[],
  durationMinutes: number,
): BusinessTypePresetResource[] {
  return names.map((name) => ({
    resourceType: "staff" as const,
    name,
    description: "",
    capacity: 1,
    durationMinutes,
  }));
}

function serviceResources(
  items: Array<{ name: string; description: string; durationMinutes: number }>,
): BusinessTypePresetResource[] {
  return items.map((item) => ({
    resourceType: "service" as const,
    name: item.name,
    description: item.description,
    capacity: 1,
    durationMinutes: item.durationMinutes,
  }));
}

function tableResources(
  count: number,
  capacity: number,
  durationMinutes: number,
): BusinessTypePresetResource[] {
  return Array.from({ length: count }, (_, index) => ({
    resourceType: "table" as const,
    name: `Table ${index + 1}`,
    description: "Dining table",
    capacity,
    durationMinutes,
  }));
}

function roomResources(
  names: string[],
  capacity: number,
  durationMinutes: number,
): BusinessTypePresetResource[] {
  return names.map((name) => ({
    resourceType: "room" as const,
    name,
    description: "",
    capacity,
    durationMinutes,
  }));
}

function staffEditor(
  title: string,
  subtitle: string,
  placeholder: string,
): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["staff"],
    defaultResourceType: "staff",
    showCapacity: false,
    showDuration: false,
    resourcesTitle: title,
    resourcesSubtitle: subtitle,
    namePlaceholder: placeholder,
  };
}

function tableEditor(): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["table"],
    defaultResourceType: "table",
    showCapacity: true,
    showDuration: false,
    resourcesTitle: "Tables",
    resourcesSubtitle: "Dining tables customers can reserve. Set capacity per table.",
    namePlaceholder: "Table 1",
  };
}

function roomEditor(
  title: string,
  subtitle: string,
  placeholder: string,
  options?: { showDuration?: boolean },
): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["room"],
    defaultResourceType: "room",
    showCapacity: true,
    showDuration: options?.showDuration ?? false,
    resourcesTitle: title,
    resourcesSubtitle: subtitle,
    namePlaceholder: placeholder,
  };
}

function serviceEditor(
  title: string,
  subtitle: string,
  placeholder: string,
): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["service"],
    defaultResourceType: "service",
    showCapacity: false,
    showDuration: true,
    resourcesTitle: title,
    resourcesSubtitle: subtitle,
    namePlaceholder: placeholder,
  };
}

function mixedRoomServiceEditor(): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["room", "service"],
    defaultResourceType: "room",
    showCapacity: true,
    showDuration: true,
    resourcesTitle: "Spaces & tours",
    resourcesSubtitle: "Event spaces and guided tour slots.",
    namePlaceholder: "Main hall",
  };
}

function coworkingEditor(): BookingResourceEditorConfig {
  return {
    allowedResourceTypes: ["room", "chair"],
    defaultResourceType: "room",
    showCapacity: true,
    showDuration: true,
    resourcesTitle: "Rooms & desks",
    resourcesSubtitle: "Meeting rooms and hot desks available to book.",
    namePlaceholder: "Meeting room A",
  };
}

export const BUSINESS_TYPE_PRESETS: Record<BusinessBookingType, BusinessTypePreset> = {
  generic: {
    type: "generic",
    label: "General business",
    description: "Consultations, meetings, and flexible appointments.",
    category: "Services",
    defaultPageTitle: "Book an appointment",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "09:00", "17:00"),
    formFields: getFormFieldsForBusinessType("generic"),
    resourceEditor: serviceEditor(
      "Appointment types",
      "Services or time slots customers can book.",
      "Consultation",
    ),
    resources: serviceResources([
      { name: "Consultation", description: "Standard appointment", durationMinutes: 60 },
      { name: "Follow-up", description: "Follow-up session", durationMinutes: 30 },
    ]),
  },
  salon: {
    type: "salon",
    label: "Beauty salon",
    description: "Stylists and chairs with short service slots.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book a visit",
    slotDurationMinutes: 45,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "19:00"),
    formFields: getFormFieldsForBusinessType("salon"),
    resourceEditor: staffEditor(
      "Stylists",
      "Team members customers can book with.",
      "Stylist Anna",
    ),
    resources: staffResources(["Stylist Anna", "Stylist Maria", "Stylist Sofia"], 45),
  },
  barbershop: {
    type: "barbershop",
    label: "Barbershop",
    description: "Barbers with quick turnaround slots.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book a haircut",
    slotDurationMinutes: 45,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "20:00"),
    formFields: getFormFieldsForBusinessType("barbershop"),
    resourceEditor: staffEditor(
      "Barbers",
      "Barbers available for online booking.",
      "Barber Alex",
    ),
    resources: staffResources(["Barber Alex", "Barber Mike", "Barber Chris"], 45),
  },
  clinic: {
    type: "clinic",
    label: "Clinic",
    description: "Doctors and specialists with precise visit lengths.",
    category: "Health",
    defaultPageTitle: "Book a visit",
    slotDurationMinutes: 30,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "18:00"),
    formFields: getFormFieldsForBusinessType("clinic"),
    resourceEditor: staffEditor(
      "Doctors & specialists",
      "Practitioners patients can schedule with.",
      "Dr. Smith",
    ),
    resources: staffResources(["Dr. Smith", "Dr. Chen", "Dr. Patel"], 30),
  },
  restaurant: {
    type: "restaurant",
    label: "Restaurant",
    description: "Tables with lunch and dinner service windows.",
    category: "Food & hospitality",
    defaultPageTitle: "Reserve a table",
    slotDurationMinutes: 120,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "11:00", "23:00"),
    formFields: getFormFieldsForBusinessType("restaurant"),
    resourceEditor: tableEditor(),
    resources: tableResources(6, 4, 120),
  },
  hotel: {
    type: "hotel",
    label: "Hotel",
    description: "Guest rooms with check-in windows.",
    category: "Food & hospitality",
    defaultPageTitle: "Book a room",
    slotDurationMinutes: 60,
    slotBufferMinutes: 30,
    advanceBookingDays: 90,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "09:00", "22:00"),
    formFields: getFormFieldsForBusinessType("hotel"),
    resourceEditor: roomEditor(
      "Rooms",
      "Guest rooms available for reservation.",
      "Room 101",
    ),
    resources: roomResources(
      ["Standard room", "Deluxe room", "Suite", "Family room", "Twin room"],
      2,
      1440,
    ),
  },
  auto_service: {
    type: "auto_service",
    label: "Auto service",
    description: "Maintenance and diagnostic appointments.",
    category: "Services",
    defaultPageTitle: "Book service",
    slotDurationMinutes: 90,
    slotBufferMinutes: 30,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "08:00", "18:00"),
    formFields: getFormFieldsForBusinessType("auto_service"),
    resourceEditor: serviceEditor(
      "Services",
      "Maintenance packages and service types customers can book.",
      "Oil change",
    ),
    resources: serviceResources([
      { name: "Oil change", description: "Routine maintenance", durationMinutes: 60 },
      { name: "Diagnostics", description: "Vehicle diagnostics", durationMinutes: 45 },
      { name: "Full service", description: "Comprehensive service", durationMinutes: 120 },
    ]),
  },
  spa: {
    type: "spa",
    label: "Spa & wellness",
    description: "Treatment specialists and wellness sessions.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book a treatment",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "20:00"),
    formFields: getFormFieldsForBusinessType("spa"),
    resourceEditor: staffEditor(
      "Therapists",
      "Specialists available for treatments.",
      "Therapist Anna",
    ),
    resources: staffResources(["Therapist Anna", "Therapist Elena", "Therapist Sofia"], 60),
  },
  gym: {
    type: "gym",
    label: "Gym & fitness",
    description: "Personal trainers and training sessions.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book a session",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "06:00", "21:00"),
    formFields: getFormFieldsForBusinessType("gym"),
    resourceEditor: staffEditor(
      "Trainers",
      "Personal trainers clients can book.",
      "Trainer Alex",
    ),
    resources: staffResources(["Trainer Alex", "Trainer Sam", "Trainer Jordan"], 60),
  },
  dentist: {
    type: "dentist",
    label: "Dental clinic",
    description: "Dentists with precise visit lengths.",
    category: "Health",
    defaultPageTitle: "Book a dental visit",
    slotDurationMinutes: 45,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "18:00"),
    formFields: getFormFieldsForBusinessType("dentist"),
    resourceEditor: staffEditor(
      "Dentists",
      "Dentists patients can schedule with.",
      "Dr. Johnson",
    ),
    resources: staffResources(["Dr. Johnson", "Dr. Lee", "Dr. Martinez"], 45),
  },
  veterinary: {
    type: "veterinary",
    label: "Veterinary clinic",
    description: "Vets for pet appointments.",
    category: "Health",
    defaultPageTitle: "Book a vet visit",
    slotDurationMinutes: 30,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "18:00"),
    formFields: getFormFieldsForBusinessType("veterinary"),
    resourceEditor: staffEditor(
      "Veterinarians",
      "Vets available for pet appointments.",
      "Dr. Parker",
    ),
    resources: staffResources(["Dr. Parker", "Dr. Kim", "Dr. Wilson"], 30),
  },
  photography: {
    type: "photography",
    label: "Photography studio",
    description: "Photographers and studio sessions.",
    category: "Professional",
    defaultPageTitle: "Book a photo session",
    slotDurationMinutes: 90,
    slotBufferMinutes: 30,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "19:00"),
    formFields: getFormFieldsForBusinessType("photography"),
    resourceEditor: staffEditor(
      "Photographers",
      "Photographers clients can book sessions with.",
      "Photographer Mia",
    ),
    resources: staffResources(["Photographer Mia", "Photographer Leo"], 90),
  },
  tutoring: {
    type: "tutoring",
    label: "Tutoring & education",
    description: "Tutors and lesson slots.",
    category: "Professional",
    defaultPageTitle: "Book a lesson",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "20:00"),
    formFields: getFormFieldsForBusinessType("tutoring"),
    resourceEditor: staffEditor(
      "Tutors",
      "Tutors students can schedule lessons with.",
      "Tutor Sarah",
    ),
    resources: staffResources(["Tutor Sarah", "Tutor David", "Tutor Emma"], 60),
  },
  legal: {
    type: "legal",
    label: "Legal services",
    description: "Attorneys and consultation slots.",
    category: "Professional",
    defaultPageTitle: "Book a consultation",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "09:00", "17:00"),
    formFields: getFormFieldsForBusinessType("legal"),
    resourceEditor: staffEditor(
      "Attorneys",
      "Lawyers available for client consultations.",
      "Attorney Morgan",
    ),
    resources: staffResources(["Attorney Morgan", "Attorney Taylor"], 60),
  },
  real_estate: {
    type: "real_estate",
    label: "Real estate",
    description: "Agents and property viewing appointments.",
    category: "Professional",
    defaultPageTitle: "Schedule a viewing",
    slotDurationMinutes: 45,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "19:00"),
    formFields: getFormFieldsForBusinessType("real_estate"),
    resourceEditor: staffEditor(
      "Agents",
      "Agents available for property viewings.",
      "Agent Rachel",
    ),
    resources: staffResources(["Agent Rachel", "Agent Tom", "Agent Nina"], 45),
  },
  coworking: {
    type: "coworking",
    label: "Coworking space",
    description: "Meeting rooms and desk reservations.",
    category: "Services",
    defaultPageTitle: "Reserve a space",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "20:00"),
    formFields: getFormFieldsForBusinessType("coworking"),
    resourceEditor: coworkingEditor(),
    resources: [
      {
        resourceType: "room",
        name: "Meeting room A",
        description: "Up to 6 people",
        capacity: 6,
        durationMinutes: 60,
      },
      {
        resourceType: "room",
        name: "Meeting room B",
        description: "Up to 4 people",
        capacity: 4,
        durationMinutes: 60,
      },
      {
        resourceType: "chair",
        name: "Hot desk",
        description: "Shared workspace desk",
        capacity: 1,
        durationMinutes: 480,
      },
    ],
  },
  pet_grooming: {
    type: "pet_grooming",
    label: "Pet grooming",
    description: "Groomers and grooming appointments.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book grooming",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "18:00"),
    formFields: getFormFieldsForBusinessType("pet_grooming"),
    resourceEditor: staffEditor(
      "Groomers",
      "Groomers available for pet appointments.",
      "Groomer Max",
    ),
    resources: staffResources(["Groomer Max", "Groomer Lily"], 60),
  },
  yoga_studio: {
    type: "yoga_studio",
    label: "Yoga studio",
    description: "Classes and instructor sessions.",
    category: "Beauty & wellness",
    defaultPageTitle: "Book a class",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "07:00", "21:00"),
    formFields: getFormFieldsForBusinessType("yoga_studio"),
    resourceEditor: roomEditor(
      "Classes",
      "Yoga classes customers can join. Set capacity for each class.",
      "Morning Vinyasa",
      { showDuration: true },
    ),
    resources: [
      {
        resourceType: "room",
        name: "Morning Vinyasa",
        description: "All levels",
        capacity: 12,
        durationMinutes: 60,
      },
      {
        resourceType: "room",
        name: "Evening Flow",
        description: "Intermediate",
        capacity: 10,
        durationMinutes: 60,
      },
      {
        resourceType: "room",
        name: "Private session",
        description: "1-on-1 with instructor",
        capacity: 1,
        durationMinutes: 60,
      },
    ],
  },
  cleaning: {
    type: "cleaning",
    label: "Cleaning service",
    description: "Cleaning packages and appointments.",
    category: "Services",
    defaultPageTitle: "Book cleaning",
    slotDurationMinutes: 120,
    slotBufferMinutes: 30,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "08:00", "18:00"),
    formFields: getFormFieldsForBusinessType("cleaning"),
    resourceEditor: serviceEditor(
      "Cleaning packages",
      "Service types customers can schedule.",
      "Standard clean",
    ),
    resources: serviceResources([
      { name: "Standard clean", description: "Regular home cleaning", durationMinutes: 120 },
      { name: "Deep clean", description: "Deep cleaning service", durationMinutes: 180 },
    ]),
  },
  event_venue: {
    type: "event_venue",
    label: "Event venue",
    description: "Event spaces and tour appointments.",
    category: "Food & hospitality",
    defaultPageTitle: "Book a tour",
    slotDurationMinutes: 60,
    slotBufferMinutes: 30,
    advanceBookingDays: 60,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "20:00"),
    formFields: getFormFieldsForBusinessType("event_venue"),
    resourceEditor: mixedRoomServiceEditor(),
    resources: [
      {
        resourceType: "room",
        name: "Main hall",
        description: "Large event space",
        capacity: 100,
        durationMinutes: 240,
      },
      {
        resourceType: "room",
        name: "Garden terrace",
        description: "Outdoor venue",
        capacity: 50,
        durationMinutes: 180,
      },
      {
        resourceType: "service",
        name: "Venue tour",
        description: "Guided venue walkthrough",
        capacity: 6,
        durationMinutes: 60,
      },
    ],
  },
};

export const BUSINESS_TYPE_PRESET_LIST = Object.values(BUSINESS_TYPE_PRESETS);

export const BUSINESS_TYPE_CATEGORIES = [
  "Beauty & wellness",
  "Health",
  "Food & hospitality",
  "Professional",
  "Services",
] as const;

export function getBusinessTypePreset(
  type: BusinessBookingType,
): BusinessTypePreset {
  return BUSINESS_TYPE_PRESETS[type];
}

export function getResourceEditorConfig(
  type: BusinessBookingType,
): BookingResourceEditorConfig {
  return BUSINESS_TYPE_PRESETS[type].resourceEditor;
}

export function getPresetFormFields(type: BusinessBookingType): BookingFormField[] {
  return cloneBookingFormFields(BUSINESS_TYPE_PRESETS[type].formFields);
}

export function getDurationOptionsForType(type: BusinessBookingType) {
  const preset = getBusinessTypePreset(type);
  const base = [15, 30, 45, 60, 90, 120, 1440];
  const values = new Set([preset.slotDurationMinutes, ...base]);

  return [...values]
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      label:
        value >= 1440
          ? "Full day"
          : value >= 60
            ? value % 60 === 0
              ? `${value / 60} hour${value / 60 > 1 ? "s" : ""}`
              : `${value} min`
            : `${value} min`,
    }));
}

export function getPresetsByCategory(): Array<{
  category: string;
  presets: BusinessTypePreset[];
}> {
  return BUSINESS_TYPE_CATEGORIES.map((category) => ({
    category,
    presets: BUSINESS_TYPE_PRESET_LIST.filter((preset) => preset.category === category),
  })).filter((group) => group.presets.length > 0);
}
