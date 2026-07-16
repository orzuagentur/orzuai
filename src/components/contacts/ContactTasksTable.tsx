"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CreateCrmTaskDialog } from "@/components/contacts/CreateCrmTaskDialog";
import {
  ContactCrmDataTable,
  ContactCrmTableBody,
  ContactCrmTableCell,
  ContactCrmTableHead,
  ContactCrmTableHeadCell,
  ContactCrmTableRow,
} from "@/components/contacts/ContactCrmDataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RelativeTime } from "@/components/ui/relative-time";
import { deleteCrmTaskAction } from "@/features/contacts/actions/delete-crm-task";
import { updateCrmTaskStatusAction } from "@/features/contacts/actions/update-crm-task-status";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import type { CrmTaskItem } from "@/types/crm-task.types";

type ContactTasksTableProps = {
  contactId: string;
  tasks: CrmTaskItem[];
  onTasksChange: () => Promise<void>;
};

function sortTasks(tasks: CrmTaskItem[]): CrmTaskItem[] {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "open" ? -1 : 1;
    }

    if (left.dueAt && right.dueAt) {
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    }

    if (left.dueAt) {
      return -1;
    }

    if (right.dueAt) {
      return 1;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) {
    return "—";
  }

  return <RelativeTime value={dueAt} />;
}

export function ContactTasksTable({
  contactId,
  tasks,
  onTasksChange,
}: ContactTasksTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const sortedTasks = sortTasks(tasks);

  async function handleToggleTask(taskId: string, status: "open" | "done") {
    setBusyTaskId(taskId);

    try {
      const result = await updateCrmTaskStatusAction({ taskId, status });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      await onTasksChange();
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteCrmTaskAction({ taskId: deleteTaskId });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(CONTACTS_MESSAGES.taskDeleted);
      setDeleteTaskId(null);
      await onTasksChange();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <ContactCrmDataTable
        title={CONTACTS_MESSAGES.tasksTitle}
        count={tasks.length}
        action={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={CONTACTS_MESSAGES.addTask}
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon className="size-4" />
          </Button>
        }
      >
        <ContactCrmTableHead>
          <ContactCrmTableHeadCell className="w-28">
            {CONTACTS_MESSAGES.columnStatus}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnTask}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnDue}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell>
            {CONTACTS_MESSAGES.columnCreated}
          </ContactCrmTableHeadCell>
          <ContactCrmTableHeadCell className="w-12 text-right">
            {CONTACTS_MESSAGES.columnActions}
          </ContactCrmTableHeadCell>
        </ContactCrmTableHead>
        <ContactCrmTableBody>
          {sortedTasks.length === 0 ? (
            <ContactCrmTableRow>
              <ContactCrmTableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                {CONTACTS_MESSAGES.tasksEmpty}
              </ContactCrmTableCell>
            </ContactCrmTableRow>
          ) : (
            sortedTasks.map((task) => (
              <ContactCrmTableRow key={task.id}>
                <ContactCrmTableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={busyTaskId === task.id}
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
                </ContactCrmTableCell>
                <ContactCrmTableCell>
                  <p
                    className={
                      task.status === "done"
                        ? "line-through text-muted-foreground"
                        : "font-medium"
                    }
                  >
                    {task.title}
                  </p>
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-muted-foreground">
                  {formatDueDate(task.dueAt)}
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-muted-foreground">
                  <RelativeTime value={task.createdAt} />
                </ContactCrmTableCell>
                <ContactCrmTableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    disabled={busyTaskId === task.id}
                    onClick={() => setDeleteTaskId(task.id)}
                    aria-label={CONTACTS_MESSAGES.deleteTask}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </ContactCrmTableCell>
              </ContactCrmTableRow>
            ))
          )}
        </ContactCrmTableBody>
      </ContactCrmDataTable>

      <CreateCrmTaskDialog
        contactId={contactId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onTasksChange}
      />

      <Dialog
        open={deleteTaskId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTaskId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{CONTACTS_MESSAGES.deleteTaskConfirmTitle}</DialogTitle>
            <DialogDescription>
              {CONTACTS_MESSAGES.deleteTaskConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTaskId(null)}
            >
              {CONTACTS_MESSAGES.cancelEdit}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void handleDeleteTask();
              }}
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                CONTACTS_MESSAGES.deleteTask
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
