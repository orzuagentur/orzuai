import { DASHBOARD_ROUTES } from "@/constants/routes";

export const SMS_INTEGRATION_PATH = `${DASHBOARD_ROUTES.integrations}/sms`;

export const SMS_MESSAGES = {
  connectTitle: "SMS via Twilio",
  connectDescription:
    "Send and receive text messages in Inbox. Uses the same Twilio account as Calls.",
  twilioRequiredTitle: "Connect Twilio first",
  twilioRequiredDescription:
    "Authorize Twilio on the Calls integration page, then return here to enable SMS.",
  openTwilioSetup: "Open Calls setup",
  enableSms: "Enable SMS",
  disableSms: "Disable SMS",
  smsEnabled: "SMS is active on your Twilio number.",
  smsDisabled: "SMS is turned off. Inbound texts will not appear in Inbox.",
  toggleSuccess: "SMS setting updated.",
  toggleFailed: "Could not update SMS setting.",
  phoneLabel: "Twilio number",
  inboxTabLabel: "SMS",
  inboxEmptyTitle: "No SMS threads yet",
  inboxEmptyDescription: "Send a text from a contact or enter a phone number.",
  inboxNotConnectedTitle: "SMS is not available",
  inboxNotConnectedDescription:
    "Connect Twilio and enable SMS in integration settings.",
  threadBack: "Back",
  threadTitle: "SMS",
  composePlaceholder: "Type a message…",
  composeSend: "Send",
  composeSending: "Sending…",
  composeSuccess: "Message sent.",
  composeFailed: "Unable to send message.",
  newThreadTitle: "New SMS",
  newThreadDescription: "Enter a phone number and message to start.",
  openThread: "Open SMS",
} as const;
