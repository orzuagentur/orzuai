"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  PencilIcon,
  SaveIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { updateCrmDealAction } from "@/features/contacts/actions/update-crm-deal";
import { deleteCrmDealAction } from "@/features/contacts/actions/delete-crm-deal";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import {
  DEAL_CURRENCIES,
  formatDealMoney,
  normalizeDealCurrency,
  type DealCurrencyCode,
} from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type PipelineStage } from "@/types/contact.types";
import {
  CRM_DEAL_STATUSES,
  type CrmDealListItem,
  type CrmDealsPageData,
  type CrmDealStatus,
} from "@/types/crm-deal.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";

type DealDetailPanelProps = {
  deal: CrmDealListItem;
  dealsData: CrmDealsPageData;
  onClose?: () => void;
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

const STATUS_ACTION_LABELS: Record<CrmDealStatus, string> = {
  open: CONTACTS_MESSAGES.markDealOpen,
  won: CONTACTS_MESSAGES.markDealWon,
  lost: CONTACTS_MESSAGES.markDealLost,
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

const SELECT_CLASSNAME =
  "border-input bg-background text-foreground flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function getStageForStatus(
  status: CrmDealStatus,
  currentStage: PipelineStage,
): PipelineStage {
  if (status === "won" || status === "lost") {
    return status;
  }

  if (currentStage === "won" || currentStage === "lost") {
    return "proposal";
  }

  return currentStage;
}

function parseDealValue(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

export function DealDetailPanel({ deal, dealsData, onClose }: DealDetailPanelProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(
    deal.value === null ? "" : String(deal.value),
  );
  const [currency, setCurrency] = useState<DealCurrencyCode>(
    normalizeDealCurrency(deal.currency),
  );
  const [stage, setStage] = useState<PipelineStage>(deal.stage);
  const [status, setStatus] = useState<CrmDealStatus>(deal.status);
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    deal.expectedCloseDate ?? "",
  );
  const [notes, setNotes] = useState(deal.notes ?? "");
  const [isPrimary, setIsPrimary] = useState(deal.isPrimary);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<
    CrmDealStatus | "primary" | "delete" | null
  >(null);

  useEffect(() => {
    setIsEditing(false);
    setTitle(deal.title);
    setValue(deal.value === null ? "" : String(deal.value));
    setCurrency(normalizeDealCurrency(deal.currency));
    setStage(deal.stage);
    setStatus(deal.status);
    setExpectedCloseDate(deal.expectedCloseDate ?? "");
    setNotes(deal.notes ?? "");
    setIsPrimary(deal.isPrimary);
  }, [
    deal.currency,
    deal.expectedCloseDate,
    deal.id,
    deal.isPrimary,
    deal.notes,
    deal.stage,
    deal.status,
    deal.title,
    deal.value,
  ]);

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

  const clearedDealHref = buildContactsHref({
    tab: "deals",
    view: dealsData.activeView === "list" ? "list" : "kanban",
    deal: null,
    contact: null,
    profile: false,
    q: dealsData.searchQuery || null,
    stage: dealsData.activeStageFilter,
    dealStatus: dealsData.activeStatusFilter,
    page: dealsData.page,
  });

  const valueIsInvalid =
    value.trim().length > 0 && !Number.isFinite(parseDealValue(value));

  function resetForm() {
    setTitle(deal.title);
    setValue(deal.value === null ? "" : String(deal.value));
    setCurrency(normalizeDealCurrency(deal.currency));
    setStage(deal.stage);
    setStatus(deal.status);
    setExpectedCloseDate(deal.expectedCloseDate ?? "");
    setNotes(deal.notes ?? "");
    setIsPrimary(deal.isPrimary);
  }

  async function handleSave() {
    if (!title.trim() || valueIsInvalid) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateCrmDealAction({
        dealId: deal.id,
        title: title.trim(),
        value: parseDealValue(value),
        currency,
        stage,
        status,
        expectedCloseDate: expectedCloseDate || null,
        notes: notes.trim() || null,
        isPrimary,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealSaved);
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickStatus(nextStatus: CrmDealStatus) {
    const nextStage = getStageForStatus(nextStatus, deal.stage);
    setBusyAction(nextStatus);

    try {
      const result = await updateCrmDealAction({
        dealId: deal.id,
        stage: nextStage,
        status: nextStatus,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealSaved);
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSetPrimary() {
    if (deal.isPrimary) {
      return;
    }

    setBusyAction("primary");

    try {
      const result = await updateCrmDealAction({
        dealId: deal.id,
        isPrimary: true,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealSaved);
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm(CONTACTS_MESSAGES.deleteDealConfirm)) {
      return;
    }

    setBusyAction("delete");

    try {
      const result = await deleteCrmDealAction({ dealId: deal.id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.dealDeleted);
      router.push(clearedDealHref);
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{deal.title}</h2>
              {deal.isPrimary ? (
                <StarIcon className="size-4 shrink-0 fill-amber-400 text-amber-400" />
              ) : null}
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {formatDealMoney(deal.value, deal.currency)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {isEditing ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={CONTACTS_MESSAGES.cancelEdit}
                disabled={isSaving}
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
              >
                <XIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={CONTACTS_MESSAGES.editDeal}
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="size-4" />
              </Button>
            )}
            {onClose ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close deal"
                onClick={onClose}
              >
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", STAGE_BADGE_CLASSNAMES[deal.stage])}
          >
            {STAGE_LABELS[deal.stage]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-xs", STATUS_BADGE_CLASSNAMES[deal.status])}
          >
            {STATUS_LABELS[deal.status]}
          </Badge>
          {deal.isPrimary ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <StarIcon className="size-3 fill-current" />
              {CONTACTS_MESSAGES.primaryDeal}
            </Badge>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-detail-title">
                {CONTACTS_MESSAGES.dealTitleLabel}
              </Label>
              <Input
                id="deal-detail-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deal-detail-value">
                  {CONTACTS_MESSAGES.dealValueLabel}
                </Label>
                <Input
                  id="deal-detail-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  aria-invalid={valueIsInvalid}
                  onChange={(event) => setValue(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-detail-currency">
                  {CONTACTS_MESSAGES.dealCurrencyLabel}
                </Label>
                <select
                  id="deal-detail-currency"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value as DealCurrencyCode)
                  }
                  className={SELECT_CLASSNAME}
                >
                  {DEAL_CURRENCIES.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deal-detail-stage">
                  {CONTACTS_MESSAGES.columnStage}
                </Label>
                <select
                  id="deal-detail-stage"
                  value={stage}
                  onChange={(event) => {
                    const nextStage = event.target.value as PipelineStage;
                    setStage(nextStage);
                    setStatus(
                      nextStage === "won" || nextStage === "lost"
                        ? nextStage
                        : "open",
                    );
                  }}
                  className={SELECT_CLASSNAME}
                >
                  {PIPELINE_STAGES.map((pipelineStage) => (
                    <option key={pipelineStage} value={pipelineStage}>
                      {STAGE_LABELS[pipelineStage]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-detail-status">
                  {CONTACTS_MESSAGES.columnDealStatus}
                </Label>
                <select
                  id="deal-detail-status"
                  value={status}
                  onChange={(event) => {
                    const nextStatus = event.target.value as CrmDealStatus;
                    setStatus(nextStatus);
                    setStage((currentStage) =>
                      getStageForStatus(nextStatus, currentStage),
                    );
                  }}
                  className={SELECT_CLASSNAME}
                >
                  {CRM_DEAL_STATUSES.map((dealStatus) => (
                    <option key={dealStatus} value={dealStatus}>
                      {STATUS_LABELS[dealStatus]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-detail-close">
                {CONTACTS_MESSAGES.expectedCloseLabel}
              </Label>
              <Input
                id="deal-detail-close"
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-detail-notes">
                {CONTACTS_MESSAGES.notesLabel}
              </Label>
              <Textarea
                id="deal-detail-notes"
                value={notes}
                rows={3}
                onChange={(event) => setNotes(event.target.value)}
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

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
              >
                {CONTACTS_MESSAGES.cancelEdit}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving || !title.trim() || valueIsInvalid}
                onClick={() => {
                  void handleSave();
                }}
              >
                {isSaving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                {CONTACTS_MESSAGES.saveDeal}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {CONTACTS_MESSAGES.expectedCloseLabel}
                </span>
                <span>{deal.expectedCloseDate ?? "No date"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {CONTACTS_MESSAGES.columnPrimary}
                </span>
                <span>
                  {deal.isPrimary
                    ? CONTACTS_MESSAGES.primaryDeal
                    : CONTACTS_MESSAGES.setPrimaryDeal}
                </span>
              </div>
            </div>

            {deal.notes ? (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {deal.notes}
              </p>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              {CRM_DEAL_STATUSES.map((dealStatus) => (
                <Button
                  key={dealStatus}
                  type="button"
                  size="sm"
                  variant={deal.status === dealStatus ? "secondary" : "outline"}
                  disabled={busyAction !== null || isSaving}
                  onClick={() => {
                    void handleQuickStatus(dealStatus);
                  }}
                >
                  {busyAction === dealStatus ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : deal.status === dealStatus ? (
                    <CheckCircle2Icon className="size-3.5" />
                  ) : null}
                  {STATUS_ACTION_LABELS[dealStatus]}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {!deal.isPrimary ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyAction !== null || isSaving}
                  onClick={() => {
                    void handleSetPrimary();
                  }}
                >
                  {busyAction === "primary" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <StarIcon className="size-4" />
                  )}
                  {CONTACTS_MESSAGES.setPrimaryDeal}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busyAction !== null || isSaving}
                onClick={() => {
                  void handleDelete();
                }}
              >
                {busyAction === "delete" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
                {CONTACTS_MESSAGES.deleteDeal}
              </Button>
            </div>
          </div>
        )}
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
            <p className="truncate font-medium">{deal.contactName}</p>
            <p className="text-sm text-muted-foreground">
              {formatContactIdentifier(deal.contactPhone)}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                getChannelBadgeClassName(deal.contactChannel),
              )}
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
