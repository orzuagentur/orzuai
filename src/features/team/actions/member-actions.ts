"use server";

import { z } from "zod";

import { TEAM_PERMISSION_KEYS } from "@/features/team/types";
import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
} from "@/services/team.service";

const permissionsSchema = z.object(
  Object.fromEntries(
    TEAM_PERMISSION_KEYS.map((key) => [key, z.boolean()]),
  ) as Record<(typeof TEAM_PERMISSION_KEYS)[number], z.ZodBoolean>,
);

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "manager", "agent", "viewer"]),
  permissions: permissionsSchema.optional(),
  accessStartsAt: z.string().nullable().optional(),
  accessEndsAt: z.string().nullable().optional(),
});

const updateSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "manager", "agent", "viewer"]).optional(),
  permissions: permissionsSchema.optional(),
  accessStartsAt: z.string().nullable().optional(),
  accessEndsAt: z.string().nullable().optional(),
});

const removeSchema = z.object({
  memberId: z.string().uuid(),
});

export async function inviteTeamMemberAction(input: z.infer<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid invite.",
    };
  }

  return inviteTeamMember(parsed.data);
}

export async function updateTeamMemberAction(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid update.",
    };
  }

  return updateTeamMember(parsed.data);
}

export async function removeTeamMemberAction(input: z.infer<typeof removeSchema>) {
  const parsed = removeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid request.",
    };
  }

  return removeTeamMember(parsed.data.memberId);
}
