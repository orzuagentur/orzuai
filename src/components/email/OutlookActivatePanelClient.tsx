"use client";

import { OutlookActivatePanel } from "@/components/email/OutlookActivatePanel";
import type {
  OutlookConnectConfig,
  OutlookConnectionData,
} from "@/types/outlook-integration.types";

type OutlookActivatePanelClientProps = {
  connection: OutlookConnectionData | null;
  hasBusiness: boolean;
  config: OutlookConnectConfig;
  embeddedInHub?: boolean;
};

export function OutlookActivatePanelClient(props: OutlookActivatePanelClientProps) {
  return <OutlookActivatePanel {...props} />;
}
