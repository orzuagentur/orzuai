"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
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
import { searchContactsForPickerAction } from "@/features/contacts/actions/search-contacts-for-picker";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import {
  DEAL_CURRENCIES,
  type DealCurrencyCode,
} from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type PipelineStage } from "@/types/contact.types";
import type { ContactPickerItem } from "@/types/crm-deal.types";

type CreateDealWithContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (dealId: string) => Promise<void>;
  initialContactId?: string | null;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function CreateDealWithContactDialog({
  open,
  onOpenChange,
  onCreated,
  initialContactId = null,
}: CreateDealWithContactDialogProps) {
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<ContactPickerItem[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialContactId,
  );
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState<DealCurrencyCode>("USD");
  const [stage, setStage] = useState<PipelineStage>("new");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedContactId(initialContactId);
  }, [initialContactId, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    void searchContactsForPickerAction(contactSearch).then((result) => {
      if (cancelled) {
        return;
      }

      setContacts(result.data);
      setIsSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contactSearch, open]);

  function resetForm() {
    setContactSearch("");
    setSelectedContactId(initialContactId);
    setTitle("");
    setValue("");
    setCurrency("USD");
    setStage("new");
    setExpectedCloseDate("");
    setNotes("");
    setIsPrimary(true);
  }

  async function handleSubmit() {
    if (!selectedContactId || !title.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const parsedValue = value.trim() ? Number.parseFloat(value) : null;
      const result = await createCrmDealAction({
        contactId: selectedContactId,
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
      await onCreated(result.data?.dealId ?? "");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;

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
            <Label htmlFor="deal-contact-search">
              {CONTACTS_MESSAGES.selectContactForDeal}
            </Label>
            <Input
              id="deal-contact-search"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder={CONTACTS_MESSAGES.selectContactPlaceholder}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {isSearching ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  …
                </div>
              ) : contacts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  {CONTACTS_MESSAGES.searchEmptyDescription}
                </p>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContactId(contact.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50",
                      selectedContactId === contact.id && "bg-primary/5",
                    )}
                  >
                    <ContactAvatar
                      name={contact.name}
                      avatarUrl={null}
                      className="size-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.phone}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                        getChannelBadgeClassName(contact.channel),
                      )}
                    >
                      <ChannelBrandIcon
                        channel={contact.channel}
                        className="size-3"
                      />
                      {getChannelBadgeLabel(contact.channel)}
                    </span>
                  </button>
                ))
              )}
            </div>
            {selectedContact ? (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedContact.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-deal-title">
              {CONTACTS_MESSAGES.dealTitleLabel}
            </Label>
            <Input
              id="global-deal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="global-deal-value">
                {CONTACTS_MESSAGES.dealValueLabel}
              </Label>
              <Input
                id="global-deal-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-deal-currency">
                {CONTACTS_MESSAGES.dealCurrencyLabel}
              </Label>
              <select
                id="global-deal-currency"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as DealCurrencyCode)
                }
                className="border-input bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
              >
                {DEAL_CURRENCIES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-deal-stage">
                {CONTACTS_MESSAGES.columnStage}
              </Label>
              <select
                id="global-deal-stage"
                value={stage}
                onChange={(event) =>
                  setStage(event.target.value as PipelineStage)
                }
                className="border-input bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
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
            <Label htmlFor="global-deal-close">
              {CONTACTS_MESSAGES.expectedCloseLabel}
            </Label>
            <Input
              id="global-deal-close"
              type="date"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-deal-notes">{CONTACTS_MESSAGES.notesLabel}</Label>
            <Textarea
              id="global-deal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
              className="size-4 rounded border"
            />
            {CONTACTS_MESSAGES.setPrimaryDeal}
          </label>
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
            disabled={isSaving || !title.trim() || !selectedContactId}
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
