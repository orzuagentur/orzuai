import type { WebsiteFormSubmissionInput } from "@/types/website-forms.types";

export function formatWebsiteFormSubmissionBody(
  input: WebsiteFormSubmissionInput,
): string {
  const lines: string[] = ["📋 New website form submission"];

  if (input.formName) {
    lines.push(`Form: ${input.formName}`);
  }

  if (input.name) {
    lines.push(`Name: ${input.name}`);
  }

  if (input.phone) {
    lines.push(`Phone: ${input.phone}`);
  }

  if (input.email) {
    lines.push(`Email: ${input.email}`);
  }

  if (input.message) {
    lines.push(`Message: ${input.message}`);
  }

  if (input.fields && Object.keys(input.fields).length > 0) {
    lines.push("Fields:");

    for (const [key, value] of Object.entries(input.fields)) {
      lines.push(`• ${key}: ${String(value)}`);
    }
  }

  if (input.sourceUrl) {
    lines.push(`Source: ${input.sourceUrl}`);
  }

  return lines.join("\n");
}

export function resolveWebsiteFormContactIdentifier(
  input: WebsiteFormSubmissionInput,
): { phoneNumber: string; displayName: string } {
  const name =
    input.name?.trim() ||
    input.email?.trim() ||
    input.phone?.trim() ||
    "Website lead";

  const normalizedPhone = input.phone?.replace(/[^\d+]/g, "") ?? "";

  if (normalizedPhone.length >= 8) {
    const phoneNumber = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : `+${normalizedPhone}`;

    return { phoneNumber, displayName: name };
  }

  if (input.email?.trim()) {
    return {
      phoneNumber: `web:email:${input.email.trim().toLowerCase()}`,
      displayName: name,
    };
  }

  const fingerprint = createSubmissionFingerprint(input);

  return {
    phoneNumber: `web:lead:${fingerprint}`,
    displayName: name,
  };
}

function createSubmissionFingerprint(
  input: WebsiteFormSubmissionInput,
): string {
  const raw = JSON.stringify({
    name: input.name,
    message: input.message,
    fields: input.fields,
    formName: input.formName,
  });

  let hash = 0;

  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
