"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2Icon, PencilIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { deleteContactAction } from "@/features/contacts/actions/delete-contact";
import { generateContactInsightsAction } from "@/features/contacts/actions/generate-contact-insights";
import { getContactProfileAction } from "@/features/contacts/actions/get-contact-profile";
import { updateContactAction } from "@/features/contacts/actions/update-contact";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import type { ContactProfileData } from "@/types/contact.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type ContactProfileDrawerProps = {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getActivityLabel(
  entry: ContactProfileData["timeline"][number],
): string {
  if (entry.activityType === "internal_note") {
    return CONTACTS_MESSAGES.internalNoteActivity;
  }

  if (entry.senderType === "client") {
    return "Customer";
  }

  if (entry.senderType === "ai" || entry.aiGenerated) {
    return "AI";
  }

  return "Team";
}

function tagsToInput(tags: string[]): string {
  return tags.join(", ");
}

function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function ContactProfileDrawer({
  contactId,
  open,
  onOpenChange,
}: ContactProfileDrawerProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ContactProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  async function loadProfile(id: string) {
    setIsLoading(true);
    const data = await getContactProfileAction(id);
    setProfile(data);
    setIsLoading(false);

    if (data) {
      setName(data.contact.name);
      setEmail(data.contact.email ?? "");
      setTagsInput(tagsToInput(data.contact.tags));
      setCompany(data.contact.customFields.company ?? "");
      setNotes(data.contact.customFields.notes ?? "");
    }
  }

  useEffect(() => {
    if (!open || !contactId) {
      return;
    }

    void loadProfile(contactId);
  }, [contactId, open]);

  useEffect(() => {
    if (!open) {
      setProfile(null);
      setIsEditing(false);
      setDeleteOpen(false);
    }
  }, [open]);

  async function handleSave() {
    if (!contactId) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateContactAction({
        contactId,
        name,
        email,
        tags: parseTagsInput(tagsInput),
        customFields: { company, notes },
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.contactSaved);
      setIsEditing(false);
      await loadProfile(contactId);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateInsights() {
    if (!contactId) {
      return;
    }

    setIsGeneratingInsights(true);

    try {
      const result = await generateContactInsightsAction({ contactId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.insightsGenerated);
      await loadProfile(contactId);
      router.refresh();
    } finally {
      setIsGeneratingInsights(false);
    }
  }

  async function handleDelete() {
    if (!contactId) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteContactAction({ contactId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.contactDeleted);
      setDeleteOpen(false);
      onOpenChange(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const inboxHref =
    profile?.conversationId && profile.contact
      ? `${DASHBOARD_ROUTES.chats}/${profile.contact.channel}?conversation=${profile.conversationId}`
      : `${DASHBOARD_ROUTES.chats}/${profile?.contact.channel ?? "whatsapp"}`;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : profile ? (
            <>
              <SheetHeader className="border-b px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SheetTitle>{profile.contact.name}</SheetTitle>
                    <SheetDescription>
                      {formatContactIdentifier(profile.contact.identifier)}
                    </SheetDescription>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditing((value) => !value)}
                      aria-label={CONTACTS_MESSAGES.editContact}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      aria-label={CONTACTS_MESSAGES.deleteContact}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`mt-2 w-fit gap-1 ${getChannelBadgeClassName(profile.contact.channel)}`}
                >
                  <ChannelBrandIcon
                    channel={profile.contact.channel}
                    className="size-3.5"
                  />
                  {getChannelBadgeLabel(profile.contact.channel)}
                </Badge>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {profile.contact.leadScore !== null ? (
                    <Badge
                      variant="outline"
                      className={getLeadScoreBadgeClassName(
                        profile.contact.leadScore,
                      )}
                    >
                      {CONTACTS_MESSAGES.leadScoreLabel}: {profile.contact.leadScore}
                      {" · "}
                      {getLeadScoreLabel(profile.contact.leadScore)}
                    </Badge>
                  ) : null}
                  {profile.contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isEditing ? (
                  <div className="mb-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">
                        {CONTACTS_MESSAGES.emailLabel}
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-tags">
                        {CONTACTS_MESSAGES.tagsLabel}
                      </Label>
                      <Input
                        id="contact-tags"
                        value={tagsInput}
                        onChange={(event) => setTagsInput(event.target.value)}
                        placeholder={CONTACTS_MESSAGES.tagsHint}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-company">
                        {CONTACTS_MESSAGES.companyLabel}
                      </Label>
                      <Input
                        id="contact-company"
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-notes">
                        {CONTACTS_MESSAGES.notesLabel}
                      </Label>
                      <Textarea
                        id="contact-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={isSaving}
                        onClick={() => {
                          void handleSave();
                        }}
                      >
                        {isSaving ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          CONTACTS_MESSAGES.saveContact
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        {CONTACTS_MESSAGES.cancelEdit}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-caption font-medium uppercase tracking-wide">
                          {CONTACTS_MESSAGES.aiSummaryLabel}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={isGeneratingInsights}
                          onClick={() => {
                            void handleGenerateInsights();
                          }}
                        >
                          {isGeneratingInsights ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : (
                            <SparklesIcon className="size-3.5" />
                          )}
                          {isGeneratingInsights
                            ? CONTACTS_MESSAGES.generatingInsights
                            : CONTACTS_MESSAGES.generateInsights}
                        </Button>
                      </div>
                      <p className="text-body text-muted-foreground">
                        {profile.contact.aiSummary ??
                          "No AI summary yet. Generate insights from recent messages."}
                      </p>
                    </div>
                    {profile.contact.email ? (
                      <p>
                        <span className="text-caption font-medium">
                          {CONTACTS_MESSAGES.emailLabel}:{" "}
                        </span>
                        {profile.contact.email}
                      </p>
                    ) : null}
                    {profile.contact.customFields.company ? (
                      <p>
                        <span className="text-caption font-medium">
                          {CONTACTS_MESSAGES.companyLabel}:{" "}
                        </span>
                        {profile.contact.customFields.company}
                      </p>
                    ) : null}
                    {profile.contact.customFields.notes ? (
                      <p className="text-muted-foreground">
                        {profile.contact.customFields.notes}
                      </p>
                    ) : null}
                  </div>
                )}

                {profile.contact.lastMessagePreview ? (
                  <div className="mb-6 rounded-lg border bg-muted/30 p-4">
                    <p className="text-caption mb-1 font-medium uppercase tracking-wide">
                      {CONTACTS_MESSAGES.lastMessage}
                    </p>
                    <p className="text-body line-clamp-4">
                      {profile.contact.lastMessagePreview}
                    </p>
                    {profile.contact.lastMessageAt ? (
                      <p className="text-caption mt-2">
                        {formatRelativeTime(profile.contact.lastMessageAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-h3 mb-3">{CONTACTS_MESSAGES.timelineTitle}</p>

                {profile.timeline.length === 0 ? (
                  <p className="text-body text-muted-foreground">
                    {CONTACTS_MESSAGES.timelineEmpty}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {profile.timeline.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-caption font-medium">
                            {getActivityLabel(entry)}
                          </span>
                          <span className="text-caption">
                            {formatRelativeTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-muted-foreground">
                          {entry.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t px-6 py-4">
                <Button asChild className="w-full">
                  <Link href={inboxHref}>{CONTACTS_MESSAGES.openInbox}</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
              Contact not found.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{CONTACTS_MESSAGES.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>
              {CONTACTS_MESSAGES.deleteConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {CONTACTS_MESSAGES.cancelEdit}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDelete();
              }}
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                CONTACTS_MESSAGES.deleteContact
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
