import { z } from "zod";

export const agentScheduleSlotSchema = z.object({
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Select at least one day."),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
});

export const agentScheduleSlotsSchema = z.array(agentScheduleSlotSchema).max(12);

export type AgentScheduleSlot = z.infer<typeof agentScheduleSlotSchema>;
