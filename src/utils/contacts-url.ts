import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { ContactSegment } from "@/types/contact.types";

export type ContactsUrlParams = {
  channel?: string | null;
  segment?: ContactSegment;
  view?: "list" | "pipeline";
  contact?: string | null;
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

  if (params.contact) {
    search.set("contact", params.contact);
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
