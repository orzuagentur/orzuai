"use server";

import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/constants/routes";
import { deleteAccount } from "@/services/auth.service";
import type { DeleteAccountInput } from "@/types/auth.types";

export async function deleteAccountAction(
  input: DeleteAccountInput,
): Promise<void> {
  const result = await deleteAccount(input);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  redirect(APP_ROUTES.home);
}
