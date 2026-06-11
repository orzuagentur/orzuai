"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

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
import { createCrmTaskAction } from "@/features/contacts/actions/create-crm-task";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";

type CreateCrmTaskDialogProps = {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
};

export function CreateCrmTaskDialog({
  contactId,
  open,
  onOpenChange,
  onCreated,
}: CreateCrmTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setTitle("");
    setDueDate("");
    setDueTime("");
  }

  async function handleSubmit() {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      let dueAt: string | null = null;

      if (dueDate) {
        const timePart = dueTime || "09:00";
        dueAt = new Date(`${dueDate}T${timePart}`).toISOString();
      }

      const result = await createCrmTaskAction({
        contactId,
        title: title.trim(),
        dueAt,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.taskSaved);
      resetForm();
      onOpenChange(false);
      await onCreated();
    } finally {
      setIsSaving(false);
    }
  }

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CONTACTS_MESSAGES.createTaskTitle}</DialogTitle>
          <DialogDescription>
            {CONTACTS_MESSAGES.createTaskDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="crm-task-title">{CONTACTS_MESSAGES.taskTitleLabel}</Label>
            <Input
              id="crm-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={CONTACTS_MESSAGES.taskTitleLabel}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="crm-task-due-date">
                {CONTACTS_MESSAGES.taskDueDateLabel}
              </Label>
              <Input
                id="crm-task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-task-due-time">
                {CONTACTS_MESSAGES.taskDueTimeLabel}
              </Label>
              <Input
                id="crm-task-due-time"
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </div>
          </div>
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
            disabled={isSaving || !title.trim()}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              CONTACTS_MESSAGES.addTask
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
