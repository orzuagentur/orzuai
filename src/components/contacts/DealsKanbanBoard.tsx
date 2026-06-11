"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { updateCrmDealAction } from "@/features/contacts/actions/update-crm-deal";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { formatDealMoney } from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealListItem, CrmDealsPageData } from "@/types/crm-deal.types";
import { PIPELINE_STAGES } from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";

type DealsKanbanBoardProps = {
  dealsData: CrmDealsPageData;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

const DRAG_DEAL_MIME = "application/x-orzuai-deal-id";

function buildDealHref(
  dealsData: CrmDealsPageData,
  dealId: string,
  contactId?: string | null,
) {
  return buildContactsHref({
    tab: "deals",
    view: "kanban",
    deal: dealId,
    contact: contactId ?? dealsData.activeContactId,
    profile: dealsData.showProfilePanel,
    q: dealsData.searchQuery || null,
    stage: dealsData.activeStageFilter,
    dealStatus: dealsData.activeStatusFilter,
    page: dealsData.page,
  });
}

export function DealsKanbanBoard({ dealsData }: DealsKanbanBoardProps) {
  const router = useRouter();
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<PipelineStage | null>(
    null,
  );

  const dealsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = dealsData.kanbanDeals.filter((deal) => deal.stage === stage);
      return acc;
    },
    {} as Record<PipelineStage, CrmDealListItem[]>,
  );

  const dealsById = new Map(
    dealsData.kanbanDeals.map((deal) => [deal.id, deal]),
  );

  async function moveDeal(deal: CrmDealListItem, stage: PipelineStage) {
    if (deal.stage === stage) {
      return;
    }

    setMovingDealId(deal.id);

    try {
      const result = await updateCrmDealAction({
        dealId: deal.id,
        stage,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.pipelineUpdated);
      router.refresh();
    } finally {
      setMovingDealId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
      {PIPELINE_STAGES.map((stage) => {
        const deals = dealsByStage[stage];
        const isDropTarget = dropTargetStage === stage;

        return (
          <section
            key={stage}
            id={`deal-stage-${stage}`}
            className={cn(
              "flex w-64 shrink-0 flex-col rounded-lg border bg-muted/20",
              isDropTarget && "ring-2 ring-primary/30",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTargetStage(stage);
            }}
            onDragLeave={() => {
              setDropTargetStage((current) => (current === stage ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDropTargetStage(null);

              const dealId =
                event.dataTransfer.getData(DRAG_DEAL_MIME) ||
                event.dataTransfer.getData("text/plain");
              const deal = dealsById.get(dealId);

              if (deal) {
                void moveDeal(deal, stage);
              }

              setDraggedDealId(null);
            }}
          >
            <header className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{STAGE_LABELS[stage]}</h3>
                <span className="text-xs text-muted-foreground">{deals.length}</span>
              </div>
            </header>

            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {deals.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {CONTACTS_MESSAGES.dropHere}
                </p>
              ) : (
                deals.map((deal) => {
                  const isSelected = dealsData.activeDealId === deal.id;
                  const isMoving = movingDealId === deal.id;

                  return (
                    <Link
                      key={deal.id}
                      href={buildDealHref(dealsData, deal.id, deal.contactId)}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_DEAL_MIME, deal.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggedDealId(deal.id);
                      }}
                      onDragEnd={() => setDraggedDealId(null)}
                      className={cn(
                        "block rounded-md border bg-card p-3 shadow-sm transition-colors hover:bg-muted/30",
                        isSelected && "border-primary/40 bg-primary/5",
                        draggedDealId === deal.id && "opacity-50",
                        isMoving && "pointer-events-none opacity-60",
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium">
                          {deal.title}
                        </p>
                        {deal.isPrimary ? (
                          <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                        ) : null}
                      </div>
                      <p className="mb-2 text-sm font-semibold text-foreground">
                        {formatDealMoney(deal.value, deal.currency)}
                      </p>
                      <div className="flex items-center gap-2">
                        <ContactAvatar
                          name={deal.contactName}
                          avatarUrl={deal.contactAvatarUrl}
                          className="size-6 shrink-0"
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {deal.contactName}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]",
                            getChannelBadgeClassName(deal.contactChannel),
                          )}
                        >
                          <ChannelBrandIcon
                            channel={deal.contactChannel}
                            className="size-2.5"
                          />
                          {getChannelBadgeLabel(deal.contactChannel)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
