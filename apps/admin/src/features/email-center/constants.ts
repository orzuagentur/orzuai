import { FROM_EMAIL_PRESET_OPTIONS } from "@orzuai/lib/email/from-addresses";

export const EMAIL_FROM_PRESET_OPTIONS = [
  { value: "default", label: "Default (code mapping)" },
  ...FROM_EMAIL_PRESET_OPTIONS,
  { value: "custom", label: "Custom email address…" },
] as const;
