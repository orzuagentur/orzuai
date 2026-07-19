import type { DocsArticle } from "@/features/docs/types";

function buildUseCaseArticle(input: {
  slug: string;
  title: string;
  summary: string;
  who: string;
  pains: string[];
  whyFits: string[];
  features: string[];
  startWith: string[];
  relatedSlugs?: string[];
}): DocsArticle {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    updatedLabel: "Updated July 2026",
    relatedSlugs: input.relatedSlugs ?? [
      "getting-started",
      "ai-agent",
      "calendar",
      "channels",
    ],
    sections: [
      {
        heading: "Who this is for",
        body: [input.who],
      },
      {
        heading: "Problems OrzuX helps solve",
        body: [
          "These are operational pains we see repeatedly — not invented marketing claims.",
        ],
        bullets: input.pains,
      },
      {
        heading: "Why OrzuX fits",
        body: input.whyFits,
      },
      {
        heading: "Features that usually matter most",
        body: [
          "You do not need every feature on day one. Start with the channels and workflows that match how customers already contact you.",
        ],
        bullets: input.features,
      },
      {
        heading: "Suggested first setup",
        body: [],
        bullets: input.startWith,
      },
      {
        heading: "Honest limits",
        body: [
          "OrzuX does not replace industry-specific clinical systems, property MLS databases, hotel PMS cores, or accounting ERPs. It sits on top of customer communication: messaging, calls, CRM context, booking, and controllable AI replies.",
        ],
      },
    ],
  };
}

export const USE_CASE_ARTICLES: Record<string, DocsArticle> = {
  "use-cases": {
    slug: "use-cases",
    title: "Business use cases",
    summary:
      "Ten industry examples of how OrzuX is typically used — what pain it addresses, which features help, and how to start without overbuilding.",
    updatedLabel: "Updated July 2026",
    relatedSlugs: [
      "clinics-and-medical",
      "real-estate",
      "hospitality-and-hotels",
      "beauty-and-salons",
      "home-services",
      "education-and-training",
      "auto-and-dealerships",
      "restaurants-and-cafes",
      "professional-services",
      "fitness-and-wellness",
    ],
    sections: [
      {
        heading: "How to read these guides",
        body: [
          "Each use case describes a real business pattern, the communication problems that waste time, and the OrzuX modules that usually help first. They are guidance — not a guarantee of results for every company.",
          "Pick the guide closest to your work, connect one channel, then expand.",
        ],
      },
      {
        heading: "Industries covered",
        body: [],
        bullets: [
          "Clinics & medical practices",
          "Real estate agencies",
          "Hospitality & hotels",
          "Beauty salons & studios",
          "Home services",
          "Education & training centers",
          "Auto services & dealerships",
          "Restaurants & cafés",
          "Professional services (legal, accounting, consulting)",
          "Fitness & wellness",
        ],
      },
    ],
  },

  "clinics-and-medical": buildUseCaseArticle({
    slug: "clinics-and-medical",
    title: "Clinics & medical practices",
    summary:
      "For clinics that receive appointment requests, FAQs, and follow-ups across WhatsApp, phone, forms, and website chat — with humans still in control of sensitive cases.",
    who: "Private clinics, dental practices, diagnostic centers, and outpatient offices that book visits and answer the same questions many times a day.",
    pains: [
      "Missed calls outside reception hours turn into lost appointments",
      "WhatsApp and form leads sit unanswered while staff are with patients",
      "Patients repeat insurance, address, and visit details across channels",
      "No shared view of who already booked, who needs a callback, and who needs a human",
    ],
    whyFits: [
      "OrzuX unifies messaging and calls next to a CRM contact record, so reception and coordinators see one customer history.",
      "Public booking pages and calendar reduce back-and-forth for routine slots. AI can answer hours, location, prep instructions, and services from your knowledge base — then hand off medical or billing exceptions to staff.",
    ],
    features: [
      "Unified inbox — WhatsApp, Website Chat, Email, and forms in one queue",
      "Calls AI — missed-call visibility and dialer for callbacks",
      "Calendar & booking — public booking pages for routine appointments",
      "CRM contacts — patient/lead context beside the conversation",
      "AI Agent + knowledge — FAQs, hours, directions, prep rules",
      "Human handoff — escalate clinical or sensitive questions to staff",
    ],
    startWith: [
      "Connect WhatsApp or Website Chat and Website Forms",
      "Publish a booking page for the visit types you allow online",
      "Add knowledge for hours, address, parking, and visit prep",
      "Enable AI only for FAQs; keep clinical advice on human handoff",
    ],
  }),

  "real-estate": buildUseCaseArticle({
    slug: "real-estate",
    title: "Real estate agencies",
    summary:
      "For agencies and brokers who qualify inquiries from ads, WhatsApp, calls, and website forms, then book viewings without losing lead context.",
    who: "Residential and commercial brokerages, listing agents, and small agency teams that live in messaging and phone.",
    pains: [
      "Leads from ads and portals arrive on different channels and get lost",
      "Brokers ask the same qualifying questions repeatedly",
      "Viewing schedules collide because calendar is disconnected from chat",
      "Handoffs between marketing and agents drop history",
    ],
    whyFits: [
      "OrzuX keeps each lead as a CRM contact with conversation history. AI can qualify budget, location, and timeline from knowledge you define, then book a viewing via calendar when rules allow.",
      "Orders/forms capture website inquiries; Calls AI helps with inbound phone interest after hours.",
    ],
    features: [
      "Website Forms + Orders — capture portal/site leads",
      "Unified inbox — WhatsApp, Telegram, Email in one place",
      "CRM — lead profile, notes, and follow-up context",
      "Calendar & booking — viewing slots and reminders",
      "AI Agent — qualify and answer listing FAQs from knowledge",
      "Team — share workspace across brokers with roles",
    ],
    startWith: [
      "Connect the channel where most leads already write (often WhatsApp)",
      "Route website forms into Orders",
      "Create knowledge for areas, process, and viewing rules",
      "Give each broker inbox access and a clear handoff rule",
    ],
  }),

  "hospitality-and-hotels": buildUseCaseArticle({
    slug: "hospitality-and-hotels",
    title: "Hospitality & hotels",
    summary:
      "For hotels, boutique stays, and guest-service teams that answer pre-arrival questions, bookings, and on-property requests across chat and phone.",
    who: "Boutique hotels, aparthotels, guest houses, and hospitality groups that handle guest messaging before and during the stay.",
    pains: [
      "Pre-arrival questions flood WhatsApp and email at odd hours",
      "Front desk misses chat while helping guests in person",
      "Request history is scattered across personal phones",
      "Upsell and late checkout conversations never reach CRM",
    ],
    whyFits: [
      "A shared inbox stops guest chats from living on staff phones. Knowledge covers check-in, amenities, and local tips. Booking pages help for tours or spa slots when you offer them. Humans take over for complaints and VIP exceptions.",
    ],
    features: [
      "Unified inbox for WhatsApp, Email, Website Chat",
      "Knowledge base for amenities, policies, and local guides",
      "CRM contacts for guest memory across stays",
      "Calendar for experiences, spa, or meeting rooms",
      "Calls AI for phone reservations and callbacks",
      "Human handoff for complaints and escalations",
    ],
    startWith: [
      "Move guest WhatsApp onto a business-connected channel",
      "Publish knowledge for check-in, parking, Wi-Fi, and house rules",
      "Enable AI for FAQs; hand off billing and complaints",
      "Invite front-desk and reservations to the same workspace",
    ],
  }),

  "beauty-and-salons": buildUseCaseArticle({
    slug: "beauty-and-salons",
    title: "Beauty salons & studios",
    summary:
      "For salons, barbers, and beauty studios that book appointments from Instagram-era messaging habits, WhatsApp, and phone — without a full-time receptionist.",
    who: "Hair salons, nail studios, aesthetic clinics (non-hospital), and beauty teams where booking volume is high and staff are busy with clients.",
    pains: [
      "Messages go unanswered during appointments",
      "No-shows rise when reminders and confirmations are manual",
      "Price and service questions repeat all day",
      "Walk-in phone calls interrupt service",
    ],
    whyFits: [
      "Public booking plus AI FAQ coverage reduces chat load. The inbox keeps client history; CRM notes capture preferences (stylist, allergies, last visit). Calls AI helps catch missed calls when the chair is occupied.",
    ],
    features: [
      "Calendar & public booking pages",
      "WhatsApp / Website Chat inbox",
      "AI Agent for prices, duration, and prep rules",
      "CRM for client preferences",
      "Calls AI for missed-call callbacks",
      "SMS where configured for reminders-style outreach",
    ],
    startWith: [
      "Create booking types for core services",
      "Connect WhatsApp and publish service/price knowledge",
      "Turn on AI for booking FAQs only",
      "Review no-show and deposit policies with a human before automating them",
    ],
  }),

  "home-services": buildUseCaseArticle({
    slug: "home-services",
    title: "Home services",
    summary:
      "For plumbers, cleaners, HVAC, movers, and field teams that win jobs from calls, WhatsApp, and website forms — and need faster quoting and scheduling.",
    who: "Local service businesses with dispatchers or owner-operators who sell appointments and site visits.",
    pains: [
      "After-hours calls go to voicemail and never convert",
      "Forms and WhatsApp leads wait until morning",
      "Job details are re-asked on every channel",
      "Technicians arrive without context from the original chat",
    ],
    whyFits: [
      "OrzuX captures leads into Orders/CRM, lets AI collect address, urgency, and job type from your scripts, and books estimate slots on the calendar. Dispatchers keep one inbox instead of personal chat threads.",
    ],
    features: [
      "Website Forms → Orders",
      "Calls AI + dialer for callbacks",
      "WhatsApp / SMS inbox",
      "CRM job context for each customer",
      "Calendar for estimates and visits",
      "AI Agent for service areas, pricing bands, and availability rules",
    ],
    startWith: [
      "Connect phone/Voice and Website Forms first",
      "Define service area and emergency vs routine rules in knowledge",
      "Create estimate booking slots",
      "Keep final pricing on human review until quotes are trusted",
    ],
  }),

  "education-and-training": buildUseCaseArticle({
    slug: "education-and-training",
    title: "Education & training centers",
    summary:
      "For schools, language centers, and course providers that answer enrollment questions and book consultations across chat, email, and phone.",
    who: "Language schools, tutoring centers, bootcamps, and continuing-education teams with admissions or front-office staff.",
    pains: [
      "Enrollment FAQs flood chat every intake season",
      "Counselors lose track of which parent was promised a call",
      "Class schedules and booking are separate from messaging",
      "After-hours questions wait until the next business day",
    ],
    whyFits: [
      "Knowledge covers programs, fees, and requirements. AI can pre-qualify interest and book a consultation. CRM keeps student/parent history; the team shares one inbox across counselors.",
    ],
    features: [
      "Unified inbox (WhatsApp, Telegram, Email, Website Chat)",
      "Knowledge base for programs and policies",
      "Calendar booking for consultations/trials",
      "CRM for lead and student context",
      "Team roles for admissions staff",
      "Analytics for conversation volume in peak seasons",
    ],
    startWith: [
      "Publish program FAQs into knowledge",
      "Connect the main parent messaging channel",
      "Offer a consultation booking page",
      "Hand off scholarship, visa, or dispute topics to humans",
    ],
  }),

  "auto-and-dealerships": buildUseCaseArticle({
    slug: "auto-and-dealerships",
    title: "Auto services & dealerships",
    summary:
      "For service desks and sales floors that handle test-drive requests, service bookings, and parts questions across phone and messaging.",
    who: "Dealerships, independent garages, detailing shops, and auto service chains with reception and sales teams.",
    pains: [
      "Service booking chats pile up while advisors are on the floor",
      "Sales leads from WhatsApp are not linked to CRM notes",
      "Customers call repeatedly for status updates",
      "No shared history between sales and service conversations",
    ],
    whyFits: [
      "OrzuX gives sales and service one communication layer. Booking pages handle routine service slots; AI answers hours, location, and package FAQs; humans own financing and complex diagnostics.",
    ],
    features: [
      "Calls AI for inbound sales/service lines",
      "WhatsApp / Website Chat inbox",
      "Calendar for service and test-drive slots",
      "CRM contact shared across teams",
      "Orders/forms for website inquiries",
      "AI knowledge for packages, hours, and prep instructions",
    ],
    startWith: [
      "Connect the busiest channel (often phone + WhatsApp)",
      "Create service booking types",
      "Add knowledge for common packages and wait policies",
      "Separate sales vs service handoff rules for the team",
    ],
  }),

  "restaurants-and-cafes": buildUseCaseArticle({
    slug: "restaurants-and-cafes",
    title: "Restaurants & cafés",
    summary:
      "For restaurants that take reservations, private-event inquiries, and FAQ traffic on WhatsApp, phone, and forms — without dedicating a full host to chat.",
    who: "Restaurants, cafés, and small multi-location food businesses that still manage guest communication manually.",
    pains: [
      "Reservation requests arrive while the floor is busy",
      "Private dining inquiries need slow email back-and-forth",
      "Hours, allergens, and parking questions repeat",
      "Missed calls during peak service",
    ],
    whyFits: [
      "Booking pages and AI FAQ coverage take routine load off the host stand. Inbox keeps event leads visible to managers. Calls AI surfaces missed calls after rush periods. Humans still confirm large parties and special requests.",
    ],
    features: [
      "Calendar & booking for tables/events where you allow online booking",
      "WhatsApp / Website Chat / Email inbox",
      "Knowledge for hours, menu highlights, allergens policy, parking",
      "Calls AI for missed reservation calls",
      "CRM for regulars and event contacts",
      "Orders/forms for catering or private-event requests",
    ],
    startWith: [
      "Decide which reservation types can be self-served online",
      "Connect WhatsApp for guest questions",
      "Publish hours and house-policy knowledge",
      "Keep large parties and allergies on human confirmation",
    ],
  }),

  "professional-services": buildUseCaseArticle({
    slug: "professional-services",
    title: "Professional services",
    summary:
      "For law firms, accounting offices, and consultancies that intake clients through forms, email, and calls — and need clean qualification before a billed consultation.",
    who: "Small and mid-size professional firms where partners’ time is expensive and intake is often chaotic.",
    pains: [
      "Unqualified inquiries consume partner calendar",
      "Email and WhatsApp threads are hard to audit",
      "Assistants re-ask the same intake questions",
      "No clear handoff from marketing site forms to matter owners",
    ],
    whyFits: [
      "Forms land in Orders; AI collects structured intake from approved scripts; booking reserves consultation slots; CRM stores the inquiry trail. Sensitive advice stays behind human review — OrzuX is the front door, not the practice system of record.",
    ],
    features: [
      "Website Forms → Orders",
      "Email + WhatsApp inbox",
      "Calendar booking for paid/consult slots",
      "CRM for prospect context",
      "AI Agent limited to intake and FAQs",
      "Team permissions for partners vs assistants",
      "Security & privacy awareness for client data",
    ],
    startWith: [
      "Publish a clear intake form and consultation booking page",
      "Write knowledge for scope, fees policy, and what you do not handle",
      "Enable AI only for intake FAQs — never for legal/tax advice",
      "Require human acceptance before any commitment email",
    ],
  }),

  "fitness-and-wellness": buildUseCaseArticle({
    slug: "fitness-and-wellness",
    title: "Fitness & wellness",
    summary:
      "For gyms, studios, and wellness centers that sell memberships and class bookings through chat, phone, and website leads.",
    who: "Fitness studios, gyms, physiotherapy/wellness centers, and coaches with a small front-desk team.",
    pains: [
      "Trial-class questions arrive faster than staff can reply",
      "Membership FAQs and schedule questions repeat",
      "No-shows on intro sessions",
      "Leads from ads are not followed up consistently",
    ],
    whyFits: [
      "Booking pages for trials, AI answers on schedule/pricing from knowledge, CRM for member prospects, and a shared inbox for WhatsApp/forms keep the front desk focused on in-person guests.",
    ],
    features: [
      "Calendar & booking for trials and consults",
      "WhatsApp / Website Chat / Forms",
      "AI knowledge for class schedule, pricing tiers, house rules",
      "CRM for prospects and members",
      "Calls AI for missed membership calls",
      "Analytics for inbound volume",
    ],
    startWith: [
      "Launch a trial-class booking page",
      "Connect WhatsApp and website forms",
      "Add schedule and pricing knowledge",
      "Hand off injury, medical, and billing disputes to staff",
    ],
  }),
};
