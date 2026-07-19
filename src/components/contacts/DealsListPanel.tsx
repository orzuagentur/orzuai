"use client";

import Link from "next/link";
import { ArrowUpRightIcon, StarIcon } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatContactIdentifier } from "@/utils/contact-display";

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

const STAGE_BADGE_CLASSNAMES: Record<PipelineStage, string> = {
  new: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  qualified:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
  proposal:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  won: "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-600/40 dark:bg-zinc-800/40 dark:text-zinc-100",
  lost: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
};

const STATUS_BADGE_CLASSNAMES: Record<CrmDealStatus, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  won: "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-600/40 dark:bg-zinc-800/40 dark:text-zinc-100",
  lost: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
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
    <ContactCrmDataTable
      title={CONTACTS_MESSAGES.dealsTitle}
      count={dealsData.total}
      className="p-4"
    >
      <ContactCrmTableHead>
        <ContactCrmTableRow>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnDeal}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>Contact</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnStage}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnClose}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="text-right">
            {CONTACTS_MESSAGES.columnValue}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>{CONTACTS_MESSAGES.columnDealStatus}</ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="text-right">
            {CONTACTS_MESSAGES.columnActions}
          </ContactCrmTableHeadCell>
        </ContactCrmTableRow>
      </ContactCrmTableHead>
      <ContactCrmTableBody>
        {dealsData.deals.map((deal) => {
          const isSelected = dealsData.activeDealId === deal.id;

          return (
            <ContactCrmTableRow
              key={deal.id}
              className={cn(
                "group",
                isSelected && "bg-primary/5 hover:bg-primary/10",
              )}
            >
              <ContactCrmTableCell>
                <Link
                  href={buildDealHref(dealsData, deal)}
                  className="block min-w-44"
                >
                  <span className="flex items-center gap-1.5 font-medium text-foreground group-hover:text-primary">
                    <span className="truncate">{deal.title}</span>
                    {deal.isPrimary ? (
                      <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    ) : null}
                  </span>
                  {deal.notes ? (
                    <span className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">
                      {deal.notes}
                    </span>
                  ) : null}
                </Link>
              </ContactCrmTableCell>
              <ContactCrmTableCell>
                <Link
                  href={buildDealHref(dealsData, deal)}
                  className="flex min-w-52 items-center gap-2"
                >
                  <ContactAvatar
                    name={deal.contactName}
                    avatarUrl={deal.contactAvatarUrl}
                    className="size-7 shrink-0"
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {deal.contactName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatContactIdentifier(deal.contactPhone)}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 gap-1 px-1.5 py-0 text-[10px]",
                      getChannelBadgeClassName(deal.contactChannel),
                    )}
                  >
                    <ChannelBrandIcon
                      channel={deal.contactChannel}
                      className="size-3"
                    />
                    {getChannelBadgeLabel(deal.contactChannel)}
                  </Badge>
                </Link>
              </ContactCrmTableCell>
              <ContactCrmTableCell>
                <Badge
                  variant="outline"
                  className={cn("text-xs", STAGE_BADGE_CLASSNAMES[deal.stage])}
                >
                  {STAGE_LABELS[deal.stage]}
                </Badge>
              </ContactCrmTableCell>
              <ContactCrmTableCell className="text-muted-foreground">
                {deal.expectedCloseDate ?? "No date"}
              </ContactCrmTableCell>
              <ContactCrmTableCell className="text-right font-semibold tabular-nums">
                {formatDealMoney(deal.value, deal.currency)}
              </ContactCrmTableCell>
              <ContactCrmTableCell>
                <Badge
                  variant="outline"
                  className={cn("text-xs", STATUS_BADGE_CLASSNAMES[deal.status])}
                >
                  {STATUS_LABELS[deal.status]}
                </Badge>
              </ContactCrmTableCell>
              <ContactCrmTableCell className="text-right">
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={buildDealHref(dealsData, deal)}>
                    {CONTACTS_MESSAGES.editDeal}
                    <ArrowUpRightIcon className="size-3.5" />
                  </Link>
                </Button>
              </ContactCrmTableCell>
            </ContactCrmTableRow>
          );
        })}
      </ContactCrmTableBody>
    </ContactCrmDataTable>
  );
}
