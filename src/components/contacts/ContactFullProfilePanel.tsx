"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  PencilIcon,
  PhoneIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { ContactAdditionalContactsSection } from "@/components/contacts/ContactAdditionalContactsSection";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ContactCrmFieldsForm } from "@/components/contacts/ContactCrmFieldsForm";
import { ContactProfileCustomFieldsSection } from "@/components/contacts/ContactProfileCustomFieldsSection";
import { ContactProfileInfoTable } from "@/components/contacts/ContactProfileInfoTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  VoiceCallModeDialog,
  type VoiceCallMode,
  type VoiceCallModeSelection,
} from "@/components/voice/VoiceCallModeDialog";
import { triggerContactVoiceCallAction } from "@/features/voice/actions/trigger-contact-voice-call";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toggleContactFavoriteAction } from "@/features/chats/actions/toggle-contact-favorite";
import { deleteContactAction } from "@/features/contacts/actions/delete-contact";
import { updateContactAction } from "@/features/contacts/actions/update-contact";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import type { ContactProfileData } from "@/types/contact.types";
import { cn } from "@/lib/utils";
import {
  contactToFormValues,
  parseTagsInput,
  type ContactCrmFormValues,
} from "@/utils/contact-crm-form";
import type { AdditionalContactEntry } from "@/utils/contact-additional-contacts";
import { buildContactProfileInfoRows } from "@/utils/contact-profile-info";
import { canUseTwilioPhoneActions } from "@/utils/contact-display";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type ContactFullProfilePanelProps = {
  profile: ContactProfileData;
  onRefresh: () => Promise<void>;
  onContactDeleted?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
};

export function ContactFullProfilePanel({
  profile,
  onRefresh,
  onContactDeleted,
  onClose,
  showCloseButton = false,
  className,
}: ContactFullProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formValues, setFormValues] = useState<ContactCrmFormValues | null>(
    () => contactToFormValues(profile.contact),
  );
  const [isFavoriteBusy, setIsFavoriteBusy] = useState(false);
  const [callModeOpen, setCallModeOpen] = useState(false);
  const [pendingCallMode, setPendingCallMode] = useState<VoiceCallMode | null>(
    null,
  );
  const [editAdditionalContacts, setEditAdditionalContacts] = useState<
    AdditionalContactEntry[]
  >([]);
  const router = useRouter();

  const { contact } = profile;
  const infoRows = buildContactProfileInfoRows(profile);
  const showTwilioCall = canUseTwilioPhoneActions(contact);

  useEffect(() => {
    if (!isEditing) {
      setFormValues(contactToFormValues(profile.contact));
    } else {
      setEditAdditionalContacts(
        profile.contact.customFields.additionalContacts ?? [],
      );
    }
  }, [isEditing, profile.contact]);

  async function handleSave() {
    if (!formValues) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateContactAction({
        contactId: contact.id,
        name: formValues.name,
        email: formValues.email,
        tags: parseTagsInput(formValues.tagsInput),
        customFields: {
          company: formValues.company,
          notes: formValues.notes,
          location: formValues.location,
          additionalContacts: editAdditionalContacts,
        },
        pipelineStage: formValues.pipelineStage,
        dealValue: formValues.dealValue
          ? Number.parseFloat(formValues.dealValue)
          : null,
        expectedCloseDate: formValues.expectedCloseDate || null,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.contactSaved);
      setIsEditing(false);
      await onRefresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteNotes() {
    if (!contact.customFields.notes?.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateContactAction({
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? "",
        tags: contact.tags,
        customFields: {
          company: contact.customFields.company ?? "",
          notes: "",
          location: contact.customFields.location ?? "",
          additionalContacts: contact.customFields.additionalContacts ?? [],
        },
        pipelineStage: contact.pipelineStage,
        dealValue: contact.dealValue,
        expectedCloseDate: contact.expectedCloseDate,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.notesDeleted);
      await onRefresh();
    } finally {
      setIsSaving(false);
    }
  }

  function handleCallContact() {
    const phoneNumber = contact.identifier?.trim();

    if (!phoneNumber) {
      return;
    }

    setCallModeOpen(true);
  }

  function handleCallModeSelect(selection: VoiceCallModeSelection) {
    const phoneNumber = contact.identifier?.trim();

    if (!phoneNumber || pendingCallMode) {
      return;
    }

    setPendingCallMode("ai");

    void (async () => {
      const result = await triggerContactVoiceCallAction({
        phoneNumber,
        contactId: contact.id,
        customPrompt: selection.customPrompt,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.callOutboundFailed);
        return;
      }

      toast.success(result.message ?? VOICE_MESSAGES.callOutboundSuccess);
      setCallModeOpen(false);

      if (result.callLogId) {
        router.push(`${DASHBOARD_ROUTES.voice}?call=${result.callLogId}`);
      }

      await onRefresh();
    })()
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : VOICE_MESSAGES.callOutboundFailed,
        );
      })
      .finally(() => {
        setPendingCallMode(null);
      });
  }

  async function handleToggleFavorite() {
    setIsFavoriteBusy(true);

    try {
      const result = await toggleContactFavoriteAction({
        contactId: contact.id,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      await onRefresh();
    } finally {
      setIsFavoriteBusy(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteContactAction({ contactId: contact.id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.contactDeleted);
      setDeleteOpen(false);
      onContactDeleted?.();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden border-l bg-card",
          className,
        )}
      >
        <div className="shrink-0 border-b px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ContactAvatar
                name={contact.name}
                avatarUrl={contact.avatarUrl}
                className="size-12 shrink-0"
                size="lg"
              />
              <div className="min-w-0 flex-1">
              <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                {CONTACTS_MESSAGES.profileTitle}
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold">
                {contact.name}
              </h2>
              <Badge
                variant="outline"
                className={`mt-2 gap-1 ${getChannelBadgeClassName(contact.channel)}`}
              >
                <ChannelBrandIcon
                  channel={contact.channel}
                  className="size-3.5"
                />
                {getChannelBadgeLabel(contact.channel)}
              </Badge>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {showTwilioCall ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={Boolean(pendingCallMode)}
                  onClick={() => {
                    handleCallContact();
                  }}
                  aria-label={VOICE_MESSAGES.callOutbound}
                >
                  {pendingCallMode ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <PhoneIcon className="size-4" />
                  )}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isFavoriteBusy}
                onClick={() => {
                  void handleToggleFavorite();
                }}
                aria-label={
                  contact.isFavorite
                    ? CONTACTS_MESSAGES.removeFromFavorites
                    : CONTACTS_MESSAGES.addToFavorites
                }
              >
                <StarIcon
                  className={cn(
                    "size-4",
                    contact.isFavorite && "fill-amber-400 text-amber-400",
                  )}
                />
              </Button>
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
              {showCloseButton && onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label={CONTACTS_MESSAGES.hideContactProfile}
                >
                  <XIcon className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isEditing && formValues ? (
            <div className="space-y-4">
              <ContactCrmFieldsForm
                values={formValues}
                onChange={(field, value) => {
                  setFormValues((current) =>
                    current ? { ...current, [field]: value } : current,
                  );
                }}
                idPrefix="profile"
              />
              <ContactAdditionalContactsSection
                additionalContacts={editAdditionalContacts}
                onContactsChange={setEditAdditionalContacts}
              />
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
                  onClick={() => {
                    setFormValues(contactToFormValues(contact));
                    setEditAdditionalContacts(
                      contact.customFields.additionalContacts ?? [],
                    );
                    setIsEditing(false);
                  }}
                >
                  {CONTACTS_MESSAGES.cancelEdit}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CONTACTS_MESSAGES.contactInfoTitle}
                </h3>
                <ContactProfileInfoTable rows={infoRows} />
                <ContactProfileCustomFieldsSection
                  contactId={contact.id}
                  profileFields={contact.customFields.profileFields ?? []}
                  onFieldsChange={() => {
                    void onRefresh();
                  }}
                />
              </div>

              {contact.sentiment ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {CONTACTS_MESSAGES.sentimentLabel}:{" "}
                  </span>
                  <span className="capitalize">{contact.sentiment}</span>
                </p>
              ) : null}

              {contact.tags.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                    {CONTACTS_MESSAGES.tagsLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {contact.customFields.notes ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {CONTACTS_MESSAGES.notesLabel}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-destructive hover:text-destructive"
                      disabled={isSaving}
                      onClick={() => {
                        void handleDeleteNotes();
                      }}
                    >
                      <Trash2Icon className="size-3.5" />
                      {CONTACTS_MESSAGES.deleteNotes}
                    </Button>
                  </div>
                  <p className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
                    {contact.customFields.notes}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

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
      <VoiceCallModeDialog
        open={callModeOpen}
        phoneNumber={contact.identifier ?? ""}
        pendingMode={pendingCallMode}
        onOpenChange={setCallModeOpen}
        onSelectMode={handleCallModeSelect}
      />
    </>
  );
}
