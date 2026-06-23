export const OUTBOUND_ADD_CONTACT_CHANNELS = ["email"] as const;

export type OutboundAddContactChannel =
  (typeof OUTBOUND_ADD_CONTACT_CHANNELS)[number];
