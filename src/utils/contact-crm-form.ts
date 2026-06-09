import type { PipelineStage, UnifiedContactItem } from "@/types/contact.types";

export type ContactCrmFormValues = {
  name: string;
  email: string;
  tagsInput: string;
  company: string;
  location: string;
  notes: string;
  pipelineStage: PipelineStage;
  dealValue: string;
  expectedCloseDate: string;
};

export function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function contactToFormValues(contact: UnifiedContactItem): ContactCrmFormValues {
  return {
    name: contact.name,
    email: contact.email ?? "",
    tagsInput: tagsToInput(contact.tags),
    company: contact.customFields.company ?? "",
    location: contact.customFields.location ?? "",
    notes: contact.customFields.notes ?? "",
    pipelineStage: contact.pipelineStage,
    dealValue: contact.dealValue !== null ? String(contact.dealValue) : "",
    expectedCloseDate: contact.expectedCloseDate ?? "",
  };
}
