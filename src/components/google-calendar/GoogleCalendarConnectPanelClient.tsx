"use client";

import { GoogleCalendarConnectPanel } from "@/components/google-calendar/GoogleCalendarConnectPanel";
import type {
  GoogleCalendarConnectConfig,
  GoogleCalendarConnectionData,
} from "@/types/google-calendar.types";

type GoogleCalendarConnectPanelClientProps = {
  connection: GoogleCalendarConnectionData | null;
  hasBusiness: boolean;
  config: GoogleCalendarConnectConfig;
  embeddedInHub?: boolean;
};

export function GoogleCalendarConnectPanelClient(
  props: GoogleCalendarConnectPanelClientProps,
) {
  return <GoogleCalendarConnectPanel {...props} />;
}
