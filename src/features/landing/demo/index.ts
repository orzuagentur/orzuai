import {
  LIVE_DEMO_EVENTS_EN,
  LIVE_DEMO_EVENTS_RU,
  LIVE_DEMO_EVENTS_UZ,
} from "@/features/landing/demo/events";
import type { LandingLiveEvent } from "@/features/landing/demo/types";

export type {
  LandingDemoBooking,
  LandingDemoCallTurn,
  LandingDemoChannelId,
  LandingDemoCrmAction,
  LandingDemoMessage,
  LandingDemoMessageRole,
  LandingLiveEvent,
  LiveSystemView,
} from "@/features/landing/demo/types";

export {
  LIVE_DEMO_EVENTS_EN,
  LIVE_DEMO_EVENTS_RU,
  LIVE_DEMO_EVENTS_UZ,
} from "@/features/landing/demo/events";

export function getLiveDemoEvents(
  locale: "en" | "ru" | "uz",
): LandingLiveEvent[] {
  switch (locale) {
    case "ru":
      return LIVE_DEMO_EVENTS_RU;
    case "uz":
      return LIVE_DEMO_EVENTS_UZ;
    default:
      return LIVE_DEMO_EVENTS_EN;
  }
}
