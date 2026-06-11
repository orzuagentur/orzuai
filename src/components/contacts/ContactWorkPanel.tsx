"use client";

import {
  ArrowLeftIcon,
  Loader2Icon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
} from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { ContactDealsTable } from "@/components/contacts/ContactDealsTable";
import { ContactMessagesTable } from "@/components/contacts/ContactMessagesTable";
import { ContactTasksTable } from "@/components/contacts/ContactTasksTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { ContactProfileData } from "@/types/contact.types";
import { cn } from "@/lib/utils";
import { formatContactIdentifier } from "@/utils/contact-display";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type ContactWorkPanelProps = {
  profile: ContactProfileData | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onBack?: () => void;
  className?: string;
};

export function ContactWorkPanel({
  profile,
  isLoading,
  onRefresh,
  profileOpen,
  onToggleProfile,
  onBack,
  className,
}: ContactWorkPanelProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center text-muted-foreground",
          className,
        )}
      >
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center p-6",
          className,
        )}
      >
        <EmptyState
          variant="contacts"
          title={CONTACTS_MESSAGES.selectContactTitle}
          description={CONTACTS_MESSAGES.selectContactDescription}
        />
      </div>
    );
  }

  const { contact } = profile;

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {onBack ? (
        <div className="shrink-0 border-b px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 px-0"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-4" />
            {CONTACTS_MESSAGES.backToList}
          </Button>
        </div>
      ) : null}

      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <ContactAvatar
              name={contact.name}
              avatarUrl={contact.avatarUrl}
              className="size-11 shrink-0"
              size="lg"
            />
            <div className="min-w-0 flex-1">
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {CONTACTS_MESSAGES.workPanelTitle}
            </p>
            <h2 className="truncate text-lg font-semibold">{contact.name}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {formatContactIdentifier(contact.identifier)}
            </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={
              profileOpen
                ? CONTACTS_MESSAGES.hideContactProfile
                : CONTACTS_MESSAGES.showContactProfile
            }
            aria-pressed={profileOpen}
            onClick={onToggleProfile}
          >
            {profileOpen ? (
              <PanelRightCloseIcon className="size-4" />
            ) : (
              <PanelRightOpenIcon className="size-4" />
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`gap-1 ${getChannelBadgeClassName(contact.channel)}`}
          >
            <ChannelBrandIcon channel={contact.channel} className="size-3.5" />
            {getChannelBadgeLabel(contact.channel)}
          </Badge>
          {contact.leadScore !== null ? (
            <Badge
              variant="outline"
              className={getLeadScoreBadgeClassName(contact.leadScore)}
            >
              {CONTACTS_MESSAGES.leadScoreLabel}: {contact.leadScore}
              {" · "}
              {getLeadScoreLabel(contact.leadScore)}
            </Badge>
          ) : null}
          {contact.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden px-6 py-5">
        <ContactTasksTable
          contactId={contact.id}
          tasks={profile.tasks}
          onTasksChange={onRefresh}
        />
        <ContactMessagesTable
          messages={profile.timeline}
          channel={contact.channel}
          conversationId={profile.conversationId}
        />
        <ContactDealsTable
          contactId={contact.id}
          deals={profile.deals}
          onDealsChange={onRefresh}
        />
      </div>
    </div>
  );
}
