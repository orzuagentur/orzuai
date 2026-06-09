"use server";

import { z } from "zod";

import { toggleContactFavorite } from "@/services/contact-favorites.service";

const toggleContactFavoriteSchema = z.object({
  contactId: z.string().uuid(),
});

export async function toggleContactFavoriteAction(
  input: z.infer<typeof toggleContactFavoriteSchema>,
) {
  const parsed = toggleContactFavoriteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: {
        message: parsed.error.issues[0]?.message ?? "Invalid contact.",
      },
    };
  }

  const result = await toggleContactFavorite(parsed.data.contactId);

  if (!result.success) {
    return {
      success: false as const,
      error: { message: result.error.message },
    };
  }

  return {
    success: true as const,
    data: result.data,
  };
}
