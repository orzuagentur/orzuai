import { EMAIL_SUBJECTS } from "./constants";

export type OnboardingDripDay = 0 | 1 | 2 | 3 | 5 | 7;

export type OnboardingDripContent = {
  subject: string;
  preview: string;
  title: string;
  body: string;
  cta: string;
};

export const ONBOARDING_DRIP_SCHEDULE: ReadonlyArray<{
  day: OnboardingDripDay;
  delayDays: number;
}> = [
  { day: 0, delayDays: 0 },
  { day: 1, delayDays: 1 },
  { day: 2, delayDays: 2 },
  { day: 3, delayDays: 3 },
  { day: 5, delayDays: 5 },
  { day: 7, delayDays: 7 },
];

export const DRIP_CONTENT: Record<OnboardingDripDay, OnboardingDripContent> = {
  0: {
    subject: EMAIL_SUBJECTS.onboardingDay0,
    preview: "Welcome to OrzuX — complete your 5-step setup in minutes.",
    title: "Let's set up your workspace",
    body: "Your account is ready. Complete the setup wizard to connect a channel, add business knowledge, and send your first AI-powered reply.",
    cta: "Start setup",
  },
  1: {
    subject: EMAIL_SUBJECTS.onboardingDay1,
    preview: "Day 1: connect WhatsApp or Instagram to start receiving messages.",
    title: "Connect your first channel",
    body: "Most teams start with WhatsApp or Instagram. Open Integrations, connect a channel, and your unified inbox will populate automatically.",
    cta: "Open integrations",
  },
  2: {
    subject: EMAIL_SUBJECTS.onboardingDay2,
    preview: "Day 2: add FAQs and policies so AI replies sound like your brand.",
    title: "Train your AI with knowledge",
    body: "Add FAQs, pricing, and policies to Knowledge Base. OrzuX uses this context for every auto-reply across all connected channels.",
    cta: "Add knowledge",
  },
  3: {
    subject: EMAIL_SUBJECTS.onboardingDay3,
    preview: "Day 3: enable your AI assistant and test a sample reply.",
    title: "Turn on your AI assistant",
    body: "Configure tone, goals, and handoff rules for your AI agent. Run a quick test message to see how it responds before going live.",
    cta: "Configure AI agent",
  },
  5: {
    subject: EMAIL_SUBJECTS.onboardingDay5,
    preview: "Day 5: save time with AI follow-ups.",
    title: "Tune AI follow-ups",
    body: "Refine your AI agent for lead follow-ups, appointment reminders, and human handoffs so your team focuses on high-value conversations.",
    cta: "Open AI agent",
  },
  7: {
    subject: EMAIL_SUBJECTS.onboardingDay7,
    preview: "Day 7: review channel performance and AI impact.",
    title: "See what's working",
    body: "Your Analytics dashboard shows response times, channel volume, and AI-assisted outcomes. Use it to refine your setup and grow faster.",
    cta: "Open analytics",
  },
};

export function getNextDripDaysAfter(day: OnboardingDripDay): OnboardingDripDay[] {
  const days = ONBOARDING_DRIP_SCHEDULE.map((entry) => entry.day);
  const index = days.indexOf(day);

  if (index === -1) {
    return [];
  }

  return days.slice(index + 1);
}

export function getDripDelayDays(dripDay: OnboardingDripDay): number {
  return (
    ONBOARDING_DRIP_SCHEDULE.find((entry) => entry.day === dripDay)?.delayDays ??
    dripDay
  );
}
