export type EmbeddedSignupFinishEvent =
  | "FINISH"
  | "FINISH_ONLY_WABA"
  | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "FINISH_OBO_MIGRATION"
  | "FINISH_GRANT_ONLY_API_ACCESS";

export type EmbeddedSignupFinishData = {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
};

export type EmbeddedSignupMessage = {
  type: "WA_EMBEDDED_SIGNUP";
  event: EmbeddedSignupFinishEvent | "CANCEL" | "ERROR";
  data: EmbeddedSignupFinishData & {
    current_step?: string;
    error_message?: string;
    error_code?: string;
  };
};

export function isTrustedEmbeddedSignupOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com"))
    );
  } catch {
    return false;
  }
}

export function isEmbeddedSignupFinishEvent(
  event: string,
): event is EmbeddedSignupFinishEvent {
  return (
    event === "FINISH" ||
    event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
    event === "FINISH_OBO_MIGRATION" ||
    event === "FINISH_GRANT_ONLY_API_ACCESS"
  );
}

export function parseEmbeddedSignupMessage(data: unknown): EmbeddedSignupMessage | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const message = data as EmbeddedSignupMessage;

  if (
    message.type !== "WA_EMBEDDED_SIGNUP" ||
    typeof message.event !== "string" ||
    !message.data ||
    typeof message.data !== "object"
  ) {
    return null;
  }

  return message;
}
