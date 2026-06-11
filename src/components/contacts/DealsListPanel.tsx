"use client";

import Link from "next/link";
import { StarIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import {
  ContactCrmDataTable,
  ContactCrmTableBody,
  ContactCrmTableCell,
  ContactCrmTableHead,
  ContactCrmTableHeadCell,
  ContactCrmTableRow,
} from "@/components/contacts/ContactCrmDataTable";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { formatDealMoney } from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealListItem, CrmDealsPageData, CrmDealStatus } from "@/types/crm-deal.types";
import { buildContactsHref } from "@/utils/contacts-url";

type DealsListPanelProps = {
  dealsData: CrmDealsPageData;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

const STATUS_LABELS: Record<CrmDealStatus, string> = {
  open: CONTACTS_MESSAGES.dealStatusOpen,
  won: CONTACTS_MESSAGES.dealStatusWon,
  lost: CONTACTS_MESSAGES.dealStatusLost,
};

function buildDealHref(dealsData: CrmDealsPageData, deal: CrmDealListItem) {
  return buildContactsHref({
    tab: "deals",
    view: "list",
    deal: deal.id,
    contact: deal.contactId,
    profile: dealsData.showProfilePanel,
    q: dealsData.searchQuery || null,
    stage: dealsData.activeStageFilter,
    dealStatus: dealsData.activeStatusFilter,
    page: dealsData.page,
  });
}

export function DealsListPanel({ dealsData }: DealsListPanelProps) {
  if (dealsData.deals.length === 0) {
    return (
      <EmptyState
        variant="contacts"
        title={CONTACTS_MESSAGES.dealsEmptyTitle}
        description={CONTACTS_MESSAGES.dealsEmptyDescription}
      />
    );
  }

  return (
    <ContactCrmDataTable title={CONTACTS_MESSAGES.dealsTitle} className="border-0">
      <ContactCrmTableHead>
        <ContactCrmTableRow>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnDeal}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>Contact</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnValue}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnStage}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnDealStatus}</ContactCrmTableHeadCell>
        </ContactCrmTableRow>
      </ContactCrmTableHead>
      <ContactCrmTableBody>
        {dealsData.deals.map((deal) => {
          const isSelected = dealsData.activeDealId === deal.id;

          return (
            <ContactCrmTableRow
              key={deal.id}
              className={cn(isSelected && "bg-primary/5")}
            >
              <ContactCrmTableCell>
                <Link
                  href={buildDealHref(dealsData, deal)}
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  {deal.title}
                  {deal.isPrimary ? (
                    <StarIcon className="size-3 fill-amber-400 text-amber-400" />
                  ) : null}
                </Link>
              </ContactCrmTableCell>
              <ContactCrmTableCell>
                <Link
                  href={buildDealHref(dealsData, deal)}
                  className="flex items-center gap-2 hover:underline"
                >
                  <ContactAvatar
                    name={deal.contactName}
                    avatarUrl={deal.contactAvatarUrl}
                    className="size-7 shrink-0"
                    size="sm"
                  />
                  <span className="min-w-0 truncate">{deal.contactName}</span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]",
                      getChannelBadgeClassName(deal.contactChannel),
                    )}
                  >
                    <ChannelBrandIcon
                      channel={deal.contactChannel}
                      className="size-2.5"
                    />
                    {getChannelBadgeLabel(deal.contactChannel)}
                  </span>
                </Link>
              </ContactCrmTableCell>
              <ContactCrmTableCell>
                {formatDealMoney(deal.value, deal.currency)}
              </ContactCrmTableCell>
              <ContactCrmTableCell>{STAGE_LABELS[deal.stage]}</ContactCrmTableCell>
              <ContactCrmTableCell>{STATUS_LABELS[deal.status]}</ContactCrmTableCell>
            </ContactCrmTableRow>
          );
        })}
      </ContactCrmTableBody>
    </ContactCrmDataTable>
  );
}
