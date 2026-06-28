import {
  cloneBookingFormFields,
  createCustomBookingFormField,
  type BookingFormField,
} from "@/lib/calendar/booking-form-fields";
import type { BusinessBookingType } from "@/types/business-calendar-resource.types";

function field(
  id: string,
  key: string,
  label: string,
  type: BookingFormField["type"],
  required: boolean,
  system = false,
): BookingFormField {
  return { id, key, label, type, required, system };
}

const FIRST_NAME = field("first_name", "firstName", "First name", "first_name", true, true);
const LAST_NAME = field("last_name", "lastName", "Last name", "last_name", true, true);
const EMAIL = field("email", "email", "Email", "email", true, true);
const PHONE = field("phone", "phone", "Phone", "phone", false);
const NOTES = field("notes", "notes", "Notes", "textarea", false);

const BUSINESS_TYPE_FORM_FIELDS: Record<BusinessBookingType, BookingFormField[]> = {
  generic: [FIRST_NAME, LAST_NAME, EMAIL, PHONE, NOTES],
  salon: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("service_notes", "serviceNotes", "Service preferences", "textarea", false),
  ],
  barbershop: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("service_notes", "serviceNotes", "Haircut style / notes", "textarea", false),
  ],
  clinic: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("visit_reason", "visitReason", "Reason for visit", "textarea", true),
  ],
  dentist: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("visit_reason", "visitReason", "Dental concern", "textarea", false),
  ],
  restaurant: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("party_size", "partySize", "Party size", "number", true),
    field("special_requests", "specialRequests", "Special requests", "textarea", false),
  ],
  hotel: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("guest_count", "guestCount", "Number of guests", "number", true),
    field("check_in_notes", "checkInNotes", "Check-in notes", "textarea", false),
  ],
  auto_service: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("vehicle", "vehicle", "Vehicle make & model", "text", true),
    field("service_notes", "serviceNotes", "Service details", "textarea", false),
  ],
  spa: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("treatment_notes", "treatmentNotes", "Treatment preferences", "textarea", false),
  ],
  gym: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("session_goals", "sessionGoals", "Training goals", "textarea", false),
  ],
  veterinary: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("pet_name", "petName", "Pet name", "text", true),
    field("pet_details", "petDetails", "Species / breed", "text", true),
    field("visit_reason", "visitReason", "Reason for visit", "textarea", false),
  ],
  photography: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("session_details", "sessionDetails", "Session type & details", "textarea", true),
  ],
  tutoring: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", false),
    field("student_name", "studentName", "Student name", "text", true),
    field("subject", "subject", "Subject", "text", true),
  ],
  legal: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("matter_summary", "matterSummary", "Brief description of your matter", "textarea", true),
  ],
  real_estate: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("property_address", "propertyAddress", "Property address", "text", true),
  ],
  coworking: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", false),
    field("team_size", "teamSize", "Team size", "number", true),
    field("booking_notes", "bookingNotes", "Booking notes", "textarea", false),
  ],
  pet_grooming: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("pet_name", "petName", "Pet name", "text", true),
    field("pet_breed", "petBreed", "Breed & size", "text", true),
    field("grooming_notes", "groomingNotes", "Grooming notes", "textarea", false),
  ],
  yoga_studio: [
    FIRST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", false),
    field("experience_level", "experienceLevel", "Experience level", "text", false),
  ],
  cleaning: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("service_address", "serviceAddress", "Service address", "text", true),
    field("service_notes", "serviceNotes", "Home size & notes", "textarea", false),
  ],
  event_venue: [
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    field("phone", "phone", "Phone", "phone", true),
    field("event_type", "eventType", "Event type", "text", true),
    field("guest_count", "guestCount", "Expected guest count", "number", true),
    field("event_notes", "eventNotes", "Event details", "textarea", false),
  ],
};

export function getFormFieldsForBusinessType(
  type: BusinessBookingType,
): BookingFormField[] {
  return cloneBookingFormFields(BUSINESS_TYPE_FORM_FIELDS[type]);
}

export { createCustomBookingFormField };
