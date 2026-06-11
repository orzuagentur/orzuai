"use client";

import { useState } from "react";
import { PlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CreateCrmDealDialog } from "@/components/contacts/CreateCrmDealDialog";
import {
  ContactCrmDataTable,
  ContactCrmTableBody,
  ContactCrmTableCell,
  ContactCrmTableHead,
  ContactCrmTableHeadCell,
  ContactCrmTableRow,
} from "@/components/contacts/ContactCrmDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteCrmDealAction } from "@/features/contacts/actions/delete-crm-deal";
import { updateCrmDealAction } from "@/features/contacts/actions/update-crm-deal";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { formatDealMoney } from "@/lib/deal-currency";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealItem, CrmDealStatus } from "@/types/crm-deal.types";
import { cn } from "@/lib/utils";

type ContactDealsTableProps = {
  contactId: string;
  deals: CrmDealItem[];
  onDealsChange: () => Promise<void>;
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

export function ContactDealsTable({
  contactId,
  deals,
  onDealsChange,
}: ContactDealsTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [busyDealId, setBusyDealId] = useState<string | null>(null);

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

      toast.success(CONTACTS_MESSAGES.dealSaved);
      await onDealsChange();
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
      await onDealsChange();
    } finally {
      setBusyDealId(null);
    }
  }

  return (
    <>
      <ContactCrmDataTable
        title={CONTACTS_MESSAGES.dealsTitle}
        count={deals.length}
        action={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={CONTACTS_MESSAGES.addDeal}
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon className="size-4" />
          </Button>
        }
      >
        <ContactCrmTableHead>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnDeal}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnStage}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="text-right">
            {CONTACTS_MESSAGES.columnValue}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnClose}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnDealStatus}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="text-center">
            {CONTACTS_MESSAGES.columnPrimary}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="text-right">
            {CONTACTS_MESSAGES.columnActions}
          </ContactCrmTableHeadCell>
        </ContactCrmTableHead>
        <ContactCrmTableBody>
          {deals.length === 0 ? (
            <ContactCrmTableRow>
              <ContactCrmTableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                {CONTACTS_MESSAGES.dealsEmpty}
              </ContactCrmTableCell>
            </ContactCrmTableRow>
          ) : (
            deals.map((deal) => (
              <ContactCrmTableRow key={deal.id}>
                <ContactCrmTableCell className="font-medium">
                  {deal.title}
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  <Badge variant="outline" className="text-xs">
                    {STAGE_LABELS[deal.stage]}
                  </Badge>
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-right tabular-nums">
                  {formatDealMoney(deal.value, deal.currency)}
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-muted-foreground">
                  {deal.expectedCloseDate ?? "—"}
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  <Badge
                    variant={
                      deal.status === "won"
                        ? "default"
                        : deal.status === "lost"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {STATUS_LABELS[deal.status]}
                  </Badge>
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-center">
                  {deal.isPrimary ? (
                    <StarIcon className="mx-auto size-4 fill-amber-400 text-amber-400" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  <div className="flex justify-end gap-1">
                    {!deal.isPrimary ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
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
                      className={cn("text-destructive hover:text-destructive")}
                      disabled={busyDealId === deal.id}
                      onClick={() => {
                        void handleDelete(deal.id);
                      }}
                      aria-label={CONTACTS_MESSAGES.deleteContact}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </ContactCrmTableCell>
              </ContactCrmTableRow>
            ))
          )}
        </ContactCrmTableBody>
      </ContactCrmDataTable>

      <CreateCrmDealDialog
        contactId={contactId}
        hasExistingDeals={deals.length > 0}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onDealsChange}
      />
    </>
  );
}
