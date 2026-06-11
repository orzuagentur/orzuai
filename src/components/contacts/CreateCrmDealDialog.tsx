"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCrmDealAction } from "@/features/contacts/actions/create-crm-deal";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  DEAL_CURRENCIES,
  type DealCurrencyCode,
} from "@/lib/deal-currency";
import { PIPELINE_STAGES, type PipelineStage } from "@/types/contact.types";

type CreateCrmDealDialogProps = {
  contactId: string;
  hasExistingDeals: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function CreateCrmDealDialog({
  contactId,
  hasExistingDeals,
  open,
  onOpenChange,
  onCreated,
}: CreateCrmDealDialogProps) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState<DealCurrencyCode>("USD");
  const [stage, setStage] = useState<PipelineStage>("new");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(!hasExistingDeals);
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setTitle("");
    setValue("");
    setCurrency("USD");
    setStage("new");
    setExpectedCloseDate("");
    setNotes("");
    setIsPrimary(!hasExistingDeals);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const parsedValue = value.trim() ? Number.parseFloat(value) : null;

      const result = await createCrmDealAction({
        contactId,
        title: title.trim(),
        value:
          parsedValue !== null && Number.isFinite(parsedValue)
            ? parsedValue
            : null,
        currency,
        stage,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes.trim() || null,
        isPrimary,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealSaved);
      resetForm();
      onOpenChange(false);
      await onCreated();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{CONTACTS_MESSAGES.createDealTitle}</DialogTitle>
          <DialogDescription>
            {CONTACTS_MESSAGES.createDealDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="crm-deal-title">{CONTACTS_MESSAGES.dealTitleLabel}</Label>
            <Input
              id="crm-deal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="crm-deal-value">{CONTACTS_MESSAGES.dealValueLabel}</Label>
              <Input
                id="crm-deal-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-deal-currency">
                {CONTACTS_MESSAGES.dealCurrencyLabel}
              </Label>
              <select
                id="crm-deal-currency"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as DealCurrencyCode)
                }
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
              >
                {DEAL_CURRENCIES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-deal-stage">{CONTACTS_MESSAGES.columnStage}</Label>
              <select
                id="crm-deal-stage"
                value={stage}
                onChange={(event) =>
                  setStage(event.target.value as PipelineStage)
                }
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
              >
                {PIPELINE_STAGES.map((pipelineStage) => (
                  <option key={pipelineStage} value={pipelineStage}>
                    {STAGE_LABELS[pipelineStage]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="crm-deal-close">
              {CONTACTS_MESSAGES.expectedCloseLabel}
            </Label>
            <Input
              id="crm-deal-close"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crm-deal-notes">{CONTACTS_MESSAGES.notesLabel}</Label>
            <Textarea
              id="crm-deal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          {hasExistingDeals ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
                className="size-4 rounded border"
              />
              {CONTACTS_MESSAGES.setPrimaryDeal}
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {CONTACTS_MESSAGES.cancelEdit}
          </Button>
          <Button
            type="button"
            disabled={isSaving || !title.trim()}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              CONTACTS_MESSAGES.addDeal
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
