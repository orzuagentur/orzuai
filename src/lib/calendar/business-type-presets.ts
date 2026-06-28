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

export type BusinessTypePreset = {
  type: BusinessBookingType;
  label: string;
  description: string;
  defaultPageTitle: string;
  slotDurationMinutes: number;
  slotBufferMinutes: number;
  advanceBookingDays: number;
  weeklySchedule: WeeklySchedule;
  resources: BusinessTypePresetResource[];
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

export const BUSINESS_TYPE_PRESETS: Record<BusinessBookingType, BusinessTypePreset> = {
  generic: {
    type: "generic",
    label: "General business",
    description: "Consultations, meetings, and flexible appointments.",
    defaultPageTitle: "Book an appointment",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "09:00", "17:00"),
    resources: [
      {
        resourceType: "service",
        name: "Appointment 1",
        description: "Standard booking slot",
        capacity: 1,
        durationMinutes: 60,
      },
      {
        resourceType: "service",
        name: "Appointment 2",
        description: "Standard booking slot",
        capacity: 1,
        durationMinutes: 60,
      },
    ],
  },
  salon: {
    type: "salon",
    label: "Beauty salon",
    description: "Stylists and chairs with short service slots.",
    defaultPageTitle: "Book a visit",
    slotDurationMinutes: 45,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "19:00"),
    resources: staffResources(["Stylist Anna", "Stylist Maria", "Stylist Sofia"], 45),
  },
  barbershop: {
    type: "barbershop",
    label: "Barbershop",
    description: "Barbers with quick turnaround slots.",
    defaultPageTitle: "Book a haircut",
    slotDurationMinutes: 45,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "20:00"),
    resources: staffResources(["Barber Alex", "Barber Mike", "Barber Chris"], 45),
  },
  clinic: {
    type: "clinic",
    label: "Clinic",
    description: "Doctors and exam rooms with precise visit lengths.",
    defaultPageTitle: "Book a visit",
    slotDurationMinutes: 30,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "18:00"),
    resources: [
      {
        resourceType: "staff",
        name: "Dr. Smith",
        description: "General consultation",
        capacity: 1,
        durationMinutes: 30,
      },
      {
        resourceType: "room",
        name: "Exam room 1",
        description: "Examination room",
        capacity: 1,
        durationMinutes: 30,
      },
    ],
  },
  restaurant: {
    type: "restaurant",
    label: "Restaurant",
    description: "Tables with lunch and dinner service windows.",
    defaultPageTitle: "Reserve a table",
    slotDurationMinutes: 120,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "11:00", "23:00"),
    resources: Array.from({ length: 6 }, (_, index) => ({
      resourceType: "table" as const,
      name: `Table ${index + 1}`,
      description: "Dining table",
      capacity: 4,
      durationMinutes: 120,
    })),
  },
  hotel: {
    type: "hotel",
    label: "Hotel",
    description: "Rooms and front-desk check-in windows.",
    defaultPageTitle: "Book a room",
    slotDurationMinutes: 60,
    slotBufferMinutes: 30,
    advanceBookingDays: 90,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "09:00", "22:00"),
    resources: Array.from({ length: 5 }, (_, index) => ({
      resourceType: "room" as const,
      name: `Room ${101 + index}`,
      description: "Guest room",
      capacity: 2,
      durationMinutes: 1440,
    })),
  },
  auto_service: {
    type: "auto_service",
    label: "Auto service",
    description: "Service bays and diagnostic appointments.",
    defaultPageTitle: "Book service",
    slotDurationMinutes: 90,
    slotBufferMinutes: 30,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "08:00", "18:00"),
    resources: [
      {
        resourceType: "service",
        name: "Maintenance",
        description: "Oil change and routine service",
        capacity: 1,
        durationMinutes: 60,
      },
      {
        resourceType: "service",
        name: "Diagnostics",
        description: "Vehicle diagnostics",
        capacity: 1,
        durationMinutes: 45,
      },
      {
        resourceType: "chair",
        name: "Bay 1",
        description: "Service bay",
        capacity: 1,
        durationMinutes: 90,
      },
      {
        resourceType: "chair",
        name: "Bay 2",
        description: "Service bay",
        capacity: 1,
        durationMinutes: 90,
      },
    ],
  },
  spa: {
    type: "spa",
    label: "Spa & wellness",
    description: "Massage rooms and treatment specialists.",
    defaultPageTitle: "Book a treatment",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "20:00"),
    resources: [
      ...staffResources(["Therapist Anna", "Therapist Elena"], 60),
      {
        resourceType: "room",
        name: "Treatment room 1",
        description: "Private spa room",
        capacity: 1,
        durationMinutes: 60,
      },
      {
        resourceType: "room",
        name: "Treatment room 2",
        description: "Private spa room",
        capacity: 1,
        durationMinutes: 60,
      },
    ],
  },
  gym: {
    type: "gym",
    label: "Gym & fitness",
    description: "Personal trainers and class slots.",
    defaultPageTitle: "Book a session",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "06:00", "21:00"),
    resources: staffResources(["Trainer Alex", "Trainer Sam", "Trainer Jordan"], 60),
  },
  dentist: {
    type: "dentist",
    label: "Dental clinic",
    description: "Dentists and dental chairs with precise visit lengths.",
    defaultPageTitle: "Book a dental visit",
    slotDurationMinutes: 45,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "18:00"),
    resources: [
      {
        resourceType: "staff",
        name: "Dr. Johnson",
        description: "General dentistry",
        capacity: 1,
        durationMinutes: 45,
      },
      {
        resourceType: "staff",
        name: "Dr. Lee",
        description: "Orthodontics",
        capacity: 1,
        durationMinutes: 45,
      },
      {
        resourceType: "chair",
        name: "Dental chair 1",
        description: "Treatment chair",
        capacity: 1,
        durationMinutes: 45,
      },
    ],
  },
  veterinary: {
    type: "veterinary",
    label: "Veterinary clinic",
    description: "Vets and exam rooms for pet appointments.",
    defaultPageTitle: "Book a vet visit",
    slotDurationMinutes: 30,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "18:00"),
    resources: [
      ...staffResources(["Dr. Parker", "Dr. Kim"], 30),
      {
        resourceType: "room",
        name: "Exam room 1",
        description: "Pet examination room",
        capacity: 1,
        durationMinutes: 30,
      },
    ],
  },
  photography: {
    type: "photography",
    label: "Photography studio",
    description: "Photographers and studio sessions.",
    defaultPageTitle: "Book a photo session",
    slotDurationMinutes: 90,
    slotBufferMinutes: 30,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "19:00"),
    resources: [
      ...staffResources(["Photographer Mia", "Photographer Leo"], 90),
      {
        resourceType: "room",
        name: "Studio A",
        description: "Main photography studio",
        capacity: 4,
        durationMinutes: 90,
      },
      {
        resourceType: "room",
        name: "Studio B",
        description: "Portrait studio",
        capacity: 2,
        durationMinutes: 60,
      },
    ],
  },
  tutoring: {
    type: "tutoring",
    label: "Tutoring & education",
    description: "Tutors and lesson slots.",
    defaultPageTitle: "Book a lesson",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "20:00"),
    resources: staffResources(["Tutor Sarah", "Tutor David", "Tutor Emma"], 60),
  },
  legal: {
    type: "legal",
    label: "Legal services",
    description: "Lawyers and consultation rooms.",
    defaultPageTitle: "Book a consultation",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 30,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "09:00", "17:00"),
    resources: [
      ...staffResources(["Attorney Morgan", "Attorney Taylor"], 60),
      {
        resourceType: "room",
        name: "Conference room",
        description: "Client meeting room",
        capacity: 4,
        durationMinutes: 60,
      },
    ],
  },
  real_estate: {
    type: "real_estate",
    label: "Real estate",
    description: "Agents and property viewing appointments.",
    defaultPageTitle: "Schedule a viewing",
    slotDurationMinutes: 45,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "19:00"),
    resources: staffResources(["Agent Rachel", "Agent Tom", "Agent Nina"], 45),
  },
  coworking: {
    type: "coworking",
    label: "Coworking space",
    description: "Meeting rooms and desk reservations.",
    defaultPageTitle: "Reserve a space",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5], "08:00", "20:00"),
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
    description: "Groomers and grooming stations.",
    defaultPageTitle: "Book grooming",
    slotDurationMinutes: 60,
    slotBufferMinutes: 15,
    advanceBookingDays: 21,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "09:00", "18:00"),
    resources: [
      ...staffResources(["Groomer Max", "Groomer Lily"], 60),
      {
        resourceType: "chair",
        name: "Grooming station 1",
        description: "Full-service grooming",
        capacity: 1,
        durationMinutes: 60,
      },
      {
        resourceType: "chair",
        name: "Grooming station 2",
        description: "Bath and trim",
        capacity: 1,
        durationMinutes: 45,
      },
    ],
  },
  yoga_studio: {
    type: "yoga_studio",
    label: "Yoga studio",
    description: "Instructors and class slots.",
    defaultPageTitle: "Book a class",
    slotDurationMinutes: 60,
    slotBufferMinutes: 10,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([0, 1, 2, 3, 4, 5, 6], "07:00", "21:00"),
    resources: [
      ...staffResources(["Instructor Maya", "Instructor Chris"], 60),
      {
        resourceType: "room",
        name: "Studio room",
        description: "Group yoga class",
        capacity: 12,
        durationMinutes: 60,
      },
    ],
  },
  cleaning: {
    type: "cleaning",
    label: "Cleaning service",
    description: "Cleaning crews and service appointments.",
    defaultPageTitle: "Book cleaning",
    slotDurationMinutes: 120,
    slotBufferMinutes: 30,
    advanceBookingDays: 14,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "08:00", "18:00"),
    resources: [
      {
        resourceType: "service",
        name: "Standard clean",
        description: "Regular home cleaning",
        capacity: 1,
        durationMinutes: 120,
      },
      {
        resourceType: "service",
        name: "Deep clean",
        description: "Deep cleaning service",
        capacity: 1,
        durationMinutes: 180,
      },
      {
        resourceType: "staff",
        name: "Team A",
        description: "Cleaning crew",
        capacity: 2,
        durationMinutes: 120,
      },
    ],
  },
  event_venue: {
    type: "event_venue",
    label: "Event venue",
    description: "Event spaces and tour appointments.",
    defaultPageTitle: "Book a tour",
    slotDurationMinutes: 60,
    slotBufferMinutes: 30,
    advanceBookingDays: 60,
    weeklySchedule: weekdaySchedule([1, 2, 3, 4, 5, 6], "10:00", "20:00"),
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

export function getBusinessTypePreset(
  type: BusinessBookingType,
): BusinessTypePreset {
  return BUSINESS_TYPE_PRESETS[type];
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
