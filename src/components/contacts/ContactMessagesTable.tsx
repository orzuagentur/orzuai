"use client";

import Link from "next/link";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import {
  ContactCrmDataTable,
  ContactCrmTableBody,
  ContactCrmTableCell,
  ContactCrmTableHead,
  ContactCrmTableHeadCell,
  ContactCrmTableRow,
} from "@/components/contacts/ContactCrmDataTable";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { ContactTimelineEntry } from "@/types/contact.types";
import type { MessagingChannel } from "@/types/database.types";

type ContactMessagesTableProps = {
  messages: ContactTimelineEntry[];
  channel: MessagingChannel;
  conversationId: string | null;
};

function getSenderLabel(entry: ContactTimelineEntry): string {
  if (entry.activityType === "crm_action") {
    return CONTACTS_MESSAGES.crmActionActivity;
  }

  if (entry.activityType === "internal_note") {
    return CONTACTS_MESSAGES.internalNoteActivity;
  }

  if (entry.senderType === "client") {
    return "Customer";
  }

  if (entry.senderType === "user") {
    return "Agent";
  }

  if (entry.senderType === "ai" || entry.aiGenerated) {
    return "AI";
  }

  return "Message";
}

export function ContactMessagesTable({
  messages,
  channel,
  conversationId,
}: ContactMessagesTableProps) {
  const recentMessages = messages
    .filter(
      (entry) =>
        entry.activityType === "message" || entry.activityType === "crm_action",
    )
    .slice(0, 8);

  const inboxHref = conversationId
    ? `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`
    : `${DASHBOARD_ROUTES.chats}/${channel}`;

  return (
    <ContactCrmDataTable
      title={CONTACTS_MESSAGES.messagesTitle}
      count={recentMessages.length}
      isEmpty={recentMessages.length === 0}
      emptyMessage={CONTACTS_MESSAGES.messagesEmpty}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={inboxHref}>{CONTACTS_MESSAGES.viewInChat}</Link>
        </Button>
      }
    >
      {recentMessages.length > 0 ? (
        <>
          <ContactCrmTableHead>
            <ContactCrmTableHeadCell>
              {CONTACTS_MESSAGES.columnWhen}
            </ContactCrmTableHeadCell>
            <ContactCrmTableHeadCell>
              {CONTACTS_MESSAGES.columnChannel}
            </ContactCrmTableHeadCell>
            <ContactCrmTableHeadCell>
              {CONTACTS_MESSAGES.columnFrom}
            </ContactCrmTableHeadCell>
            <ContactCrmTableHeadCell>
              {CONTACTS_MESSAGES.columnPreview}
            </ContactCrmTableHeadCell>
          </ContactCrmTableHead>
          <ContactCrmTableBody>
            {recentMessages.map((entry) => (
              <ContactCrmTableRow key={entry.id}>
                <ContactCrmTableCell className="whitespace-nowrap text-muted-foreground">
                  <RelativeTime value={entry.createdAt} />
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${getChannelBadgeClassName(entry.channel)}`}
                  >
                    <ChannelBrandIcon channel={entry.channel} className="size-3" />
                    {getChannelBadgeLabel(entry.channel)}
                  </span>
                </ContactCrmTableCell>
                <ContactCrmTableCell className="font-medium">
                  {getSenderLabel(entry)}
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  {entry.activityType === "crm_action" ? (
                    <span className="line-clamp-2 text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                      {entry.content}
                    </span>
                  ) : (
                    <Link
                      href={inboxHref}
                      className="line-clamp-2 text-muted-foreground transition-colors hover:text-foreground [overflow-wrap:anywhere] [word-break:break-word]"
                    >
                      {entry.content}
                    </Link>
                  )}
                </ContactCrmTableCell>
              </ContactCrmTableRow>
            ))}
          </ContactCrmTableBody>
        </>
      ) : null}
    </ContactCrmDataTable>
  );
}
