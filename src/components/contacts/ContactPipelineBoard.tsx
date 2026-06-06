"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ContactProfileDrawer } from "@/components/contacts/ContactProfileDrawer";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { updateContactPipelineStageAction } from "@/features/contacts/actions/update-contact-pipeline-stage";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { getChannelBadgeClassName, getChannelBadgeLabel } from "@/features/chats/channel-ui";
import type {
  ContactPipelinePageData,
  PipelineStage,
  UnifiedContactItem,
} from "@/types/contact.types";
import { PIPELINE_STAGES } from "@/types/contact.types";
import { formatContactIdentifier } from "@/utils/contact-display";

type ContactPipelineBoardProps = ContactPipelinePageData;

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

export function ContactPipelineBoard({
  hasBusiness,
  columns,
}: ContactPipelineBoardProps) {
  const router = useRouter();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [movingContactId, setMovingContactId] = useState<string | null>(null);

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

  function openContact(contactId: string) {
    setSelectedContactId(contactId);
    setDrawerOpen(true);
  }

  return (
    <>
      <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage}
            className="min-w-[220px] rounded-xl border bg-card lg:min-w-0"
          >
            <div className="border-b px-3 py-3">
              <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
              <p className="text-caption">{columns[stage].length} contacts</p>
            </div>
            <ul className="space-y-2 p-2">
              {columns[stage].map((contact) => (
                <li
                  key={contact.id}
                  className="rounded-lg border bg-background p-3 shadow-sm"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => openContact(contact.id)}
                  >
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
                  </button>
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
                    {PIPELINE_STAGES.map((option) => (
                      <option key={option} value={option}>
                        {STAGE_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ContactProfileDrawer
        contactId={selectedContactId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
