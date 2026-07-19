export type LandingDemoChannelId =
  | "whatsapp"
  | "telegram"
  | "website_chat"
  | "email"
  | "voice";

export type LandingDemoMessageRole = "customer" | "ai" | "system";

export type LandingDemoMessage = {
  role: LandingDemoMessageRole;
  text: string;
};

export type LandingDemoCallTurn = {
  speaker: "customer" | "ai";
  text: string;
};

export type LandingDemoBooking = {
  id: string;
  dayIndex: number;
  time: string;
  title: string;
  customer: string;
  status: "confirmed" | "pending" | "busy";
};

export type LandingDemoCrmAction = {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "queued";
};

export type LandingLiveEvent = {
  id: string;
  channel: LandingDemoChannelId;
  label: string;
  customer: string;
  /** Inbox list preview */
  preview: string;
  messages: LandingDemoMessage[];
  intent: string;
  deal: string;
  nextStep: string;
  callStatus: string;
  calendar: string;
  metric: string;
  crmActions: LandingDemoCrmAction[];
  callTurns?: LandingDemoCallTurn[];
  bookings?: LandingDemoBooking[];
  dialNumber?: string;
};

export type LiveSystemView = "inbox" | "calls" | "calendar";
