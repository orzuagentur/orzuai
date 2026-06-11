"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { updateContactPipelineStageAction } from "@/features/contacts/actions/update-contact-pipeline-stage";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type {
  ContactPipelinePageData,
  CrmEntityTab,
  LeadsPageData,
  PipelineStage,
  UnifiedContactItem,
  UnifiedContactsPageData,
} from "@/types/contact.types";
import { LEAD_PIPELINE_STAGES, PIPELINE_STAGES } from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatContactIdentifier } from "@/utils/contact-display";

type ContactPipelineBoardProps = ContactPipelinePageData & {
  activeContactId?: string | null;
  listData?: UnifiedContactsPageData | LeadsPageData;
  stages?: readonly PipelineStage[];
  tab?: CrmEntityTab;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

const DRAG_CONTACT_MIME = "application/x-orzuai-contact-id";

function buildContactHref(
  data: UnifiedContactsPageData | LeadsPageData,
  contactId: string,
  tab: CrmEntityTab,
): string {
  if (tab === "leads" && "activeLeadSegment" in data) {
    return buildContactsHref({
      tab: "leads",
      channel: data.activeChannelFilter,
      leadSegment: data.activeLeadSegment,
      view: "pipeline",
      contact: contactId,
      profile: data.showProfilePanel,
      q: data.searchQuery || null,
      page: data.page,
    });
  }

  return buildContactsHref({
    tab: "contacts",
    channel: data.activeChannelFilter,
    segment: data.activeSegment,
    view: "pipeline",
    contact: contactId,
    profile: data.showProfilePanel,
    q: data.searchQuery || null,
    page: data.page,
  });
}

export function ContactPipelineBoard({
  hasBusiness,
  columns,
  activeContactId = null,
  listData,
  stages = PIPELINE_STAGES,
  tab = "contacts",
}: ContactPipelineBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusStage = searchParams.get("stage");
  const [movingContactId, setMovingContactId] = useState<string | null>(null);
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<PipelineStage | null>(
    null,
  );

  useEffect(() => {
    if (!focusStage || !PIPELINE_STAGES.includes(focusStage as PipelineStage)) {
      return;
    }

    document
      .getElementById(`pipeline-stage-${focusStage}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusStage]);

  const contactsById = useMemo(() => {
    const map = new Map<string, UnifiedContactItem>();

    for (const stage of stages) {
      for (const contact of columns[stage]) {
        map.set(contact.id, contact);
      }
    }

    return map;
  }, [columns]);

  if (!hasBusiness) {
    return null;
  }

  async function moveContact(contact: UnifiedContactItem, stage: PipelineStage) {
    if (contact.pipelineStage === stage) {
      return;
    }

    setMovingContactId(contact.id);

    try {
      const result = await updateContactPipelineStageAction({
        contactId: contact.id,
        pipelineStage: stage,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.pipelineUpdated);
      router.refresh();
    } finally {
      setMovingContactId(null);
    }
  }

  function handleDragStart(contactId: string) {
    setDraggedContactId(contactId);
  }

  function handleDragEnd() {
    setDraggedContactId(null);
    setDropTargetStage(null);
  }

  function handleDrop(stage: PipelineStage, contactId: string) {
    const contact = contactsById.get(contactId);

    if (!contact) {
      return;
    }

    void moveContact(contact, stage);
    handleDragEnd();
  }

  return (
    <div className="p-4">
      <div
        className={cn(
          "grid gap-4 overflow-x-auto pb-2",
          stages.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-5",
        )}
      >
        {stages.map((stage) => (
          <div
            key={stage}
            id={`pipeline-stage-${stage}`}
            className={cn(
              "min-w-[220px] rounded-xl border bg-card lg:min-w-0",
              focusStage === stage && "border-primary/50 ring-2 ring-primary/20",
              dropTargetStage === stage && "border-primary/50 ring-2 ring-primary/20",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTargetStage(stage);
            }}
            onDragLeave={() => {
              setDropTargetStage((current) => (current === stage ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const contactId =
                event.dataTransfer.getData(DRAG_CONTACT_MIME) ||
                event.dataTransfer.getData("text/plain");
              handleDrop(stage, contactId);
            }}
          >
            <div className="border-b px-3 py-3">
              <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
              <p className="text-caption">{columns[stage].length} contacts</p>
            </div>
            <ul className="space-y-2 p-2">
              {dropTargetStage === stage && draggedContactId ? (
                <li className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-4 text-center text-xs text-muted-foreground">
                  {CONTACTS_MESSAGES.dropHere}
                </li>
              ) : null}
              {columns[stage].map((contact) => {
                const isSelected = contact.id === activeContactId;
                const isDragging = draggedContactId === contact.id;
                const card = (
                  <>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-caption">
                      {formatContactIdentifier(contact.identifier)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-2 gap-1 px-1.5 py-0 text-[10px] ${getChannelBadgeClassName(contact.channel)}`}
                    >
                      <ChannelBrandIcon
                        channel={contact.channel}
                        className="size-3"
                      />
                      {getChannelBadgeLabel(contact.channel)}
                    </Badge>
                  </>
                );

                return (
                  <li
                    key={contact.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_CONTACT_MIME, contact.id);
                      event.dataTransfer.setData("text/plain", contact.id);
                      event.dataTransfer.effectAllowed = "move";
                      handleDragStart(contact.id);
                    }}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "rounded-lg border bg-background p-3 shadow-sm transition-opacity",
                      isSelected && "border-primary/40 ring-1 ring-primary/20",
                      isDragging && "opacity-50",
                    )}
                  >
                    {listData ? (
                      <Link
                        href={buildContactHref(listData, contact.id, tab)}
                        className="block w-full text-left"
                        draggable={false}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {card}
                      </Link>
                    ) : (
                      <div className="w-full text-left">{card}</div>
                    )}
                    <select
                      className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={contact.pipelineStage}
                      disabled={movingContactId === contact.id}
                      onChange={(event) => {
                        void moveContact(
                          contact,
                          event.target.value as PipelineStage,
                        );
                      }}
                    >
                      {(tab === "leads" ? LEAD_PIPELINE_STAGES : PIPELINE_STAGES).map(
                        (option) => (
                          <option key={option} value={option}>
                            {STAGE_LABELS[option]}
                          </option>
                        ),
                      )}
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
