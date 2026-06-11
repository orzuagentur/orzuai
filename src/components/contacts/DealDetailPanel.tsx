"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, StarIcon } from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { formatDealMoney } from "@/lib/deal-currency";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealListItem, CrmDealsPageData, CrmDealStatus } from "@/types/crm-deal.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";

type DealDetailPanelProps = {
  deal: CrmDealListItem;
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

export function DealDetailPanel({ deal, dealsData }: DealDetailPanelProps) {
  const router = useRouter();

  const contactHref = buildContactsHref({
    tab: "deals",
    view: dealsData.activeView === "list" ? "list" : "kanban",
    deal: deal.id,
    contact: deal.contactId,
    profile: true,
    q: dealsData.searchQuery || null,
    stage: dealsData.activeStageFilter,
    dealStatus: dealsData.activeStatusFilter,
    page: dealsData.page,
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-4">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">{deal.title}</h2>
          {deal.isPrimary ? (
            <StarIcon className="size-4 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {formatDealMoney(deal.value, deal.currency)}
        </p>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{CONTACTS_MESSAGES.columnStage}</span>
            <span>{STAGE_LABELS[deal.stage]}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {CONTACTS_MESSAGES.columnDealStatus}
            </span>
            <span>{STATUS_LABELS[deal.status]}</span>
          </div>
          {deal.expectedCloseDate ? (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                {CONTACTS_MESSAGES.expectedCloseLabel}
              </span>
              <span>{deal.expectedCloseDate}</span>
            </div>
          ) : null}
        </div>
        {deal.notes ? (
          <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {deal.notes}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-b px-4 py-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Contact
        </p>
        <div className="flex items-center gap-3">
          <ContactAvatar
            name={deal.contactName}
            avatarUrl={deal.contactAvatarUrl}
            className="size-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{deal.contactName}</p>
            <p className="text-sm text-muted-foreground">
              {formatContactIdentifier(deal.contactPhone)}
            </p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${getChannelBadgeClassName(deal.contactChannel)}`}
            >
              <ChannelBrandIcon
                channel={deal.contactChannel}
                className="size-3"
              />
              {getChannelBadgeLabel(deal.contactChannel)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" asChild>
            <Link href={contactHref}>{CONTACTS_MESSAGES.openContact}</Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={`${DASHBOARD_ROUTES.chats}/${deal.contactChannel}`}>
              <ExternalLinkIcon className="mr-1.5 size-3.5" />
              {CONTACTS_MESSAGES.openInbox}
            </Link>
          </Button>
        </div>
      </div>

      {dealsData.showProfilePanel && dealsData.activeContactId ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* ContactRecordWorkspace rendered by parent */}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          <Button
            type="button"
            variant="link"
            onClick={() => router.push(contactHref)}
          >
            {CONTACTS_MESSAGES.showContactProfile}
          </Button>
        </div>
      )}
    </div>
  );
}
