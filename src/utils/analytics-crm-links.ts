import type { PipelineStage } from "@/types/contact.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildContactsHref } from "@/utils/contacts-url";

export function buildAnalyticsCrmPipelineHref(options?: {
  channel?: MessagingChannel | null;
  stage?: PipelineStage;
}): string {
  return buildContactsHref({
    view: "pipeline",
    channel: options?.channel ?? null,
    stage: options?.stage ?? null,
  });
}
