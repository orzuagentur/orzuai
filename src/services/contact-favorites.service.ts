import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";

export type ToggleContactFavoriteResult =
  | {
      success: true;
      data: {
        contactId: string;
        contactName: string;
        isFavorite: boolean;
      };
    }
  | {
      success: false;
      error: { code: string; message: string };
    };

export async function toggleContactFavorite(
  contactId: string,
): Promise<ToggleContactFavoriteResult> {
  const trimmedId = contactId?.trim();

  if (!trimmedId) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CHAT_MESSAGES.missingConfig,
      },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, phone_number, is_favorite")
    .eq("id", trimmedId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!contact) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const nextFavorite = !contact.is_favorite;

  const { error } = await supabase
    .from("contacts")
    .update({ is_favorite: nextFavorite })
    .eq("id", contact.id)
    .eq("business_id", business.id);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.chats);
  revalidatePath(`${DASHBOARD_ROUTES.chats}/favorites`);

  return {
    success: true,
    data: {
      contactId: contact.id,
      contactName: contact.name || contact.phone_number,
      isFavorite: nextFavorite,
    },
  };
}
