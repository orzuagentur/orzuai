import { CONTACT_EMAIL } from "@/constants/app-origin";

export const LANDING_BOOK_DEMO = {
  label: "Book a demo",
  href: `mailto:${CONTACT_EMAIL}?subject=OrzuX%20demo%20request`,
} as const;
