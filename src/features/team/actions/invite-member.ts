"use server";

import { z } from "zod";

import { inviteTeamMember } from "@/services/team.service";

const schema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "manager", "agent", "viewer"]),
});

export async function inviteTeamMemberAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid invite.",
    };
  }

  return inviteTeamMember(parsed.data);
}
