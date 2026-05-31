"use server";

import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/constants/routes";
import { signOut } from "@/services/auth.service";

export async function signOutAction(): Promise<void> {
  const result = await signOut();

  if (!result.success) {
    throw new Error(result.error);
  }

  redirect(APP_ROUTES.home);
}
