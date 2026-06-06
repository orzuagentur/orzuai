import { z } from "zod";

export const CRM_TASK_STATUSES = ["open", "done"] as const;

export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number];

export const createCrmTaskSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  dueAt: z.string().datetime().optional().nullable(),
});

export const updateCrmTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(CRM_TASK_STATUSES),
});

export const deleteCrmTaskSchema = z.object({
  taskId: z.string().uuid(),
});

export type CreateCrmTaskInput = z.infer<typeof createCrmTaskSchema>;
export type UpdateCrmTaskStatusInput = z.infer<typeof updateCrmTaskStatusSchema>;
export type DeleteCrmTaskInput = z.infer<typeof deleteCrmTaskSchema>;

export type CrmTaskItem = {
  id: string;
  contactId: string;
  title: string;
  dueAt: string | null;
  status: CrmTaskStatus;
  createdAt: string;
};

export type CrmTaskActionResult =
  | { success: true }
  | { success: false; error: { code: string; message: string } };
