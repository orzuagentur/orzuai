import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { ContactSegment, PipelineStage } from "@/types/contact.types";

export type ContactsUrlParams = {
  channel?: string | null;
  segment?: ContactSegment;
  view?: "list" | "pipeline";
  stage?: PipelineStage | null;
  contact?: string | null;
  profile?: boolean;
  q?: string | null;
  page?: number;
};

export function buildContactsHref(params: ContactsUrlParams = {}): string {
  const search = new URLSearchParams();

  if (params.channel) {
    search.set("channel", params.channel);
  }

  if (params.segment && params.segment !== "all") {
    search.set("segment", params.segment);
  }

  if (params.view === "pipeline") {
    search.set("view", "pipeline");
  }

  if (params.stage) {
    search.set("stage", params.stage);
  }

  if (params.contact) {
    search.set("contact", params.contact);
  }

  if (params.profile) {
    search.set("profile", "1");
  }

  const query = params.q?.trim();
  if (query) {
    search.set("q", query);
  }

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }

  const queryString = search.toString();

  return queryString
    ? `${DASHBOARD_ROUTES.contacts}?${queryString}`
    : DASHBOARD_ROUTES.contacts;
}
