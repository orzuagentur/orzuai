"use client";

import { EmailActivatePanel } from "@/components/email/EmailActivatePanel";
import type {
  GmailConnectConfig,
  GmailConnectionData,
} from "@/types/gmail-integration.types";

type EmailActivatePanelClientProps = {
  connection: GmailConnectionData | null;
  hasBusiness: boolean;
  config: GmailConnectConfig;
  embeddedInHub?: boolean;
};

export function EmailActivatePanelClient(props: EmailActivatePanelClientProps) {
  return <EmailActivatePanel {...props} />;
}
