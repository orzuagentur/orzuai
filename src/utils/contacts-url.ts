import { DASHBOARD_ROUTES } from "@/constants/routes";
import type {
  ContactSegment,
  CrmEntityTab,
  LeadSegment,
  PipelineStage,
} from "@/types/contact.types";
import type { CrmDealStatus } from "@/types/crm-deal.types";

export type ContactsUrlParams = {
  tab?: CrmEntityTab;
  channel?: string | null;
  segment?: ContactSegment;
  leadSegment?: LeadSegment;
  view?: "list" | "pipeline" | "kanban";
  stage?: PipelineStage | null;
  contact?: string | null;
  deal?: string | null;
  profile?: boolean;
  q?: string | null;
  page?: number;
  dealStatus?: CrmDealStatus | null;
};

export function buildContactsHref(params: ContactsUrlParams = {}): string {
  const search = new URLSearchParams();
  const tab = params.tab ?? "contacts";

  if (tab !== "contacts") {
    search.set("tab", tab);
  }

  if (params.channel) {
    search.set("channel", params.channel);
  }

  if (tab === "contacts" && params.segment && params.segment !== "all") {
    search.set("segment", params.segment);
  }

  if (tab === "leads" && params.leadSegment && params.leadSegment !== "all_leads") {
    search.set("leadSegment", params.leadSegment);
  }

  if (tab === "contacts" || tab === "leads") {
    if (params.view === "pipeline") {
      search.set("view", "pipeline");
    }
  }

  if (tab === "deals") {
    if (params.view === "list") {
      search.set("view", "list");
    }

    if (params.dealStatus) {
      search.set("dealStatus", params.dealStatus);
    }
  }

  if (params.stage) {
    search.set("stage", params.stage);
  }

  if (params.contact) {
    search.set("contact", params.contact);
  }

  if (params.deal) {
    search.set("deal", params.deal);
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
