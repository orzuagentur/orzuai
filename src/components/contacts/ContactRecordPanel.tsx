"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  Loader2Icon,
  PencilIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { ContactCrmFieldsForm } from "@/components/contacts/ContactCrmFieldsForm";
import { ContactDealsSection } from "@/components/contacts/ContactDealsSection";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { createCrmTaskAction } from "@/features/contacts/actions/create-crm-task";
import { deleteContactAction } from "@/features/contacts/actions/delete-contact";
import { generateContactInsightsAction } from "@/features/contacts/actions/generate-contact-insights";
import { getContactProfileAction } from "@/features/contacts/actions/get-contact-profile";
import { updateContactAction } from "@/features/contacts/actions/update-contact";
import { updateCrmTaskStatusAction } from "@/features/contacts/actions/update-crm-task-status";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import type { ContactProfileData, PipelineStage } from "@/types/contact.types";
import { cn } from "@/lib/utils";
import {
  contactToFormValues,
  parseTagsInput,
  type ContactCrmFormValues,
} from "@/utils/contact-crm-form";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";
import {
  getLeadScoreBadgeClassName,
  getLeadScoreLabel,
} from "@/utils/lead-score";

type ContactRecordPanelProps = {
  contactId: string | null;
  onContactDeleted?: () => void;
  onBack?: () => void;
  className?: string;
};

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

function getTimelineLabel(
  entry: ContactProfileData["timeline"][number],
): string {
  if (entry.activityType === "internal_note") {
    return CONTACTS_MESSAGES.internalNoteActivity;
  }

  if (entry.senderType === "client") {
    return "Customer";
  }

  if (entry.senderType === "user") {
    return "Agent";
  }

  if (entry.senderType === "ai") {
    return "AI";
  }

  return "Message";
}

export function ContactRecordPanel({
  contactId,
  onContactDeleted,
  onBack,
  className,
}: ContactRecordPanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ContactProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formValues, setFormValues] = useState<ContactCrmFormValues | null>(
    null,
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  async function loadProfile(id: string) {
    setIsLoading(true);
    const data = await getContactProfileAction(id);
    setProfile(data);
    setIsLoading(false);

    if (data) {
      setFormValues(contactToFormValues(data.contact));
    }
  }

  useEffect(() => {
    if (!contactId) {
      setProfile(null);
      setIsEditing(false);
      setDeleteOpen(false);
      return;
    }

    void loadProfile(contactId);
  }, [contactId]);

  async function handleSave() {
    if (!contactId || !formValues) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateContactAction({
        contactId,
        name: formValues.name,
        email: formValues.email,
        tags: parseTagsInput(formValues.tagsInput),
        customFields: {
          company: formValues.company,
          location: formValues.location,
          notes: formValues.notes,
        },
        pipelineStage: formValues.pipelineStage,
        dealValue: formValues.dealValue.trim()
          ? Number(formValues.dealValue)
          : null,
        expectedCloseDate: formValues.expectedCloseDate || null,
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

  async function handleCreateTask() {
    if (!contactId || !taskTitle.trim()) {
      return;
    }

    setIsCreatingTask(true);

    try {
      const result = await createCrmTaskAction({
        contactId,
        title: taskTitle,
        dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.taskSaved);
      setTaskTitle("");
      setTaskDueAt("");
      await loadProfile(contactId);
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleToggleTask(taskId: string, status: "open" | "done") {
    const result = await updateCrmTaskStatusAction({ taskId, status });

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    if (contactId) {
      await loadProfile(contactId);
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
      onContactDeleted?.();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (!contactId) {
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

  const inboxHref =
    profile?.conversationId && profile.contact
      ? `${DASHBOARD_ROUTES.chats}/${profile.contact.channel}?conversation=${profile.conversationId}`
      : `${DASHBOARD_ROUTES.chats}/${profile?.contact.channel ?? "whatsapp"}`;

  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          className,
        )}
      >
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

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <>
            <div className="shrink-0 border-b px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{profile.contact.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatContactIdentifier(profile.contact.identifier)}
                  </p>
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
                {profile.contact.sentiment ? (
                  <p className="text-sm">
                    <span className="text-caption font-medium">
                      {CONTACTS_MESSAGES.sentimentLabel}:{" "}
                    </span>
                    <span className="capitalize">{profile.contact.sentiment}</span>
                  </p>
                ) : null}
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
              {isEditing && formValues ? (
                  <div className="mb-6">
                    <ContactCrmFieldsForm
                      values={formValues}
                      onChange={(field, value) => {
                        setFormValues((current) =>
                          current ? { ...current, [field]: value } : current,
                        );
                      }}
                      idPrefix="contact"
                    />
                    <div className="mt-4 flex gap-2">
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
                          if (profile) {
                            setFormValues(contactToFormValues(profile.contact));
                          }
                          setIsEditing(false);
                        }}
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
                  {profile.contact.customFields.location ? (
                    <p>
                      <span className="text-caption font-medium">
                        {CONTACTS_MESSAGES.locationLabel}:{" "}
                      </span>
                      {profile.contact.customFields.location}
                    </p>
                  ) : null}
                  <p>
                    <span className="text-caption font-medium">
                      {CONTACTS_MESSAGES.pipelineStageLabel}:{" "}
                    </span>
                    {PIPELINE_STAGE_LABELS[profile.contact.pipelineStage]}
                  </p>
                  {profile.contact.customFields.notes ? (
                    <p className="text-muted-foreground">
                      {profile.contact.customFields.notes}
                    </p>
                  ) : null}
                  {profile.contact.dealValue !== null ? (
                    <p>
                      <span className="text-caption font-medium">
                        {CONTACTS_MESSAGES.dealValueLabel}:{" "}
                      </span>
                      ${profile.contact.dealValue.toLocaleString()}
                    </p>
                  ) : null}
                  {profile.contact.expectedCloseDate ? (
                    <p>
                      <span className="text-caption font-medium">
                        {CONTACTS_MESSAGES.expectedCloseLabel}:{" "}
                      </span>
                      {profile.contact.expectedCloseDate}
                    </p>
                  ) : null}
                </div>
              )}

              {contactId ? (
                <ContactDealsSection
                  contactId={contactId}
                  deals={profile.deals}
                />
              ) : null}

              <div className="mb-6 space-y-3">
                <p className="text-h3">{CONTACTS_MESSAGES.timelineTitle}</p>
                {profile.timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {CONTACTS_MESSAGES.timelineEmpty}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {profile.timeline.slice(0, 2).map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption text-muted-foreground">
                            {getTimelineLabel(entry)}
                          </span>
                          <span className="text-caption">
                            {formatRelativeTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 [overflow-wrap:anywhere] [word-break:break-word]">
                          {entry.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={inboxHref}>{CONTACTS_MESSAGES.viewInChat}</Link>
                </Button>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-h3">{CONTACTS_MESSAGES.tasksTitle}</p>
                <ul className="space-y-2">
                  {profile.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <p
                          className={
                            task.status === "done"
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {task.title}
                        </p>
                        {task.dueAt ? (
                          <p className="text-caption">
                            {formatRelativeTime(task.dueAt)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleToggleTask(
                            task.id,
                            task.status === "done" ? "open" : "done",
                          );
                        }}
                      >
                        {task.status === "done"
                          ? CONTACTS_MESSAGES.taskOpen
                          : CONTACTS_MESSAGES.taskDone}
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 rounded-lg border p-3">
                  <Input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder={CONTACTS_MESSAGES.taskTitleLabel}
                  />
                  <Input
                    type="datetime-local"
                    value={taskDueAt}
                    onChange={(event) => setTaskDueAt(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isCreatingTask || !taskTitle.trim()}
                    onClick={() => {
                      void handleCreateTask();
                    }}
                  >
                    {isCreatingTask ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      CONTACTS_MESSAGES.addTask
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-muted-foreground">
            Contact not found.
          </div>
        )}
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
    </>
  );
}
