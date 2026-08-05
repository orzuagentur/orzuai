const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+|00)?[\d][\d\s\-().]{7,20}\d/g;

/** Redact common PII before persisting LLM-related log text. */
export function redactPiiForStorage(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[email]")
    .replace(PHONE_PATTERN, "[phone]");
}
