"use client";

import Link from "next/link";
import {
  Building2Icon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  TagIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { PipelineStage, UnifiedContactItem } from "@/types/contact.types";

type InboxCrmEditorProps = {
  contactId: string | null;
  contactProfile: UnifiedContactItem | null;
  isLoading: boolean;
};

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

function formatDealValue(value: number | null): string {
  if (value === null) {
    return CHAT_MESSAGES.notAvailable;
  }

  return `$${value.toLocaleString()}`;
}

export function InboxCrmEditor({
  contactId,
  contactProfile,
  isLoading,
}: InboxCrmEditorProps) {
  const crmHref = contactId
    ? `${DASHBOARD_ROUTES.contacts}?contact=${contactId}`
    : DASHBOARD_ROUTES.contacts;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        {CHAT_MESSAGES.crmAssistantLoading}
      </div>
    );
  }

  if (!contactProfile) {
    return (
      <p className="text-sm text-muted-foreground">{CHAT_MESSAGES.notAvailable}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MailIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {contactProfile.email ?? CHAT_MESSAGES.contactEmailUnavailable}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2Icon className="size-3.5 shrink-0" />
          <span className="truncate">
            {contactProfile.customFields.company ?? CHAT_MESSAGES.notAvailable}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPinIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {contactProfile.customFields.location ??
              CHAT_MESSAGES.contactLocationUnavailable}
          </span>
        </div>
        {contactProfile.tags.length ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <TagIcon className="mt-0.5 size-3.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {contactProfile.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {CONTACTS_MESSAGES.pipelineStageLabel}
            </span>
            <span>{PIPELINE_STAGE_LABELS[contactProfile.pipelineStage]}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {CONTACTS_MESSAGES.dealValueLabel}
            </span>
            <span>{formatDealValue(contactProfile.dealValue)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              {CONTACTS_MESSAGES.expectedCloseLabel}
            </span>
            <span>
              {contactProfile.expectedCloseDate ?? CHAT_MESSAGES.notAvailable}
            </span>
          </div>
        </div>
        {contactProfile.customFields.notes ? (
          <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
            <span className="font-medium text-foreground">
              {CONTACTS_MESSAGES.notesLabel}:{" "}
            </span>
            {contactProfile.customFields.notes}
          </p>
        ) : null}
      </div>

      <Button variant="link" size="sm" className="h-auto p-0" asChild>
        <Link href={crmHref}>{CHAT_MESSAGES.viewInCrm}</Link>
      </Button>
    </div>
  );
}
