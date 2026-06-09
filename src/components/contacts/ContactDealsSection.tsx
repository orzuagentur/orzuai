"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCrmDealAction } from "@/features/contacts/actions/create-crm-deal";
import { deleteCrmDealAction } from "@/features/contacts/actions/delete-crm-deal";
import { updateCrmDealAction } from "@/features/contacts/actions/update-crm-deal";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealItem } from "@/types/crm-deal.types";

type ContactDealsSectionProps = {
  contactId: string;
  deals: CrmDealItem[];
  onDealsChange?: (deals: CrmDealItem[]) => void;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function ContactDealsSection({
  contactId,
  deals,
  onDealsChange,
}: ContactDealsSectionProps) {
  const router = useRouter();
  const [newDealTitle, setNewDealTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [busyDealId, setBusyDealId] = useState<string | null>(null);

  async function handleCreateDeal() {
    if (!newDealTitle.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const result = await createCrmDealAction({
        contactId,
        title: newDealTitle.trim(),
        isPrimary: deals.length === 0,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealSaved);
      setNewDealTitle("");
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSetPrimary(dealId: string) {
    setBusyDealId(dealId);

    try {
      const result = await updateCrmDealAction({
        dealId,
        isPrimary: true,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      onDealsChange?.(
        deals.map((deal) => ({
          ...deal,
          isPrimary: deal.id === dealId,
        })),
      );
      toast.success(CONTACTS_MESSAGES.dealSaved);
      router.refresh();
    } finally {
      setBusyDealId(null);
    }
  }

  async function handleDelete(dealId: string) {
    setBusyDealId(dealId);

    try {
      const result = await deleteCrmDealAction({ dealId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealDeleted);
      router.refresh();
    } finally {
      setBusyDealId(null);
    }
  }

  return (
    <div className="mb-6 space-y-3">
      <p className="text-h3">{CONTACTS_MESSAGES.dealsTitle}</p>
      <ul className="space-y-2">
        {deals.map((deal) => (
          <li
            key={deal.id}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{deal.title}</p>
                  {deal.isPrimary ? (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <StarIcon className="size-3 fill-current" />
                      {CONTACTS_MESSAGES.primaryDeal}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-caption text-muted-foreground">
                  {STAGE_LABELS[deal.stage]}
                  {deal.value !== null ? ` · $${deal.value.toLocaleString()}` : ""}
                  {deal.expectedCloseDate
                    ? ` · ${deal.expectedCloseDate}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!deal.isPrimary ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyDealId === deal.id}
                    onClick={() => {
                      void handleSetPrimary(deal.id);
                    }}
                  >
                    {CONTACTS_MESSAGES.setPrimaryDeal}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  disabled={busyDealId === deal.id}
                  onClick={() => {
                    void handleDelete(deal.id);
                  }}
                  aria-label={CONTACTS_MESSAGES.deleteContact}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={newDealTitle}
          onChange={(event) => setNewDealTitle(event.target.value)}
          placeholder={CONTACTS_MESSAGES.dealTitleLabel}
        />
        <Button
          type="button"
          size="sm"
          disabled={isCreating || !newDealTitle.trim()}
          onClick={() => {
            void handleCreateDeal();
          }}
        >
          {isCreating ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            CONTACTS_MESSAGES.addDeal
          )}
        </Button>
      </div>
    </div>
  );
}
