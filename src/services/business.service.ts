import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  BUSINESS_LOGOS_BUCKET,
  BUSINESS_MESSAGES,
  DEFAULT_AI_LANGUAGE,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/features/business/constants";
import { getDefaultGeminiModel } from "@/lib/env.schema";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import type {
  BusinessPayload,
  CreateBusinessResult,
  UpdateBusinessResult,
  UploadBusinessLogoResult,
} from "@/types/business.types";
import {
  ALLOWED_BUSINESS_LOGO_TYPES,
  MAX_BUSINESS_LOGO_SIZE_BYTES,
  createBusinessSchema,
  updateBusinessSchema,
} from "@/types/business.types";
import type { Business } from "@/types/database.types";
import {
  buildBusinessLogoPath,
  emptyStringToNull,
  getBusinessLogoExtension,
  mapBusinessToProfile,
} from "@/utils/business";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: BUSINESS_MESSAGES.missingConfig,
    },
  };
}

function revalidateBusinessPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.settings);
}

const MESSAGING_CHANNELS = [
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
] as const;

async function bootstrapBusinessDefaults(businessId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.from("analytics").upsert(
    {
      business_id: businessId,
      total_messages: 0,
      total_contacts: 0,
      ai_replies: 0,
    },
    { onConflict: "business_id" },
  );

  for (const channel of MESSAGING_CHANNELS) {
    await Promise.all([
      supabase.from("channel_analytics").upsert(
        {
          business_id: businessId,
          channel,
          total_messages: 0,
          total_contacts: 0,
          ai_replies: 0,
        },
        { onConflict: "business_id,channel" },
      ),
      supabase.from("ai_settings").upsert(
        {
          business_id: businessId,
          channel,
          provider: "gemini",
          model: getDefaultGeminiModel(),
          language: DEFAULT_AI_LANGUAGE,
          system_prompt: DEFAULT_AI_SYSTEM_PROMPT,
          ai_enabled: false,
        },
        { onConflict: "business_id,channel" },
      ),
    ]);
  }
}

function mapPayloadToRow(payload: BusinessPayload) {
  return {
    business_name: payload.businessName,
    business_description: emptyStringToNull(payload.businessDescription),
    phone: emptyStringToNull(payload.phone),
    email: emptyStringToNull(payload.email),
    address: emptyStringToNull(payload.address),
    website: emptyStringToNull(payload.website),
  };
}

export async function getPrimaryBusiness(
  userId: string,
): Promise<Business | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function createBusiness(
  input: BusinessPayload,
): Promise<CreateBusinessResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = createBusinessSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const user = await requireUser();
  const existingBusiness = await getPrimaryBusiness(user.id);

  if (existingBusiness) {
    return {
      success: false,
      error: {
        code: "ALREADY_EXISTS",
        message: BUSINESS_MESSAGES.alreadyExists,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      user_id: user.id,
      ...mapPayloadToRow(parsed.data),
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: error?.message || BUSINESS_MESSAGES.genericError,
      },
    };
  }

  await bootstrapBusinessDefaults(data.id);
  revalidateBusinessPaths();

  return {
    success: true,
    data: mapBusinessToProfile(data),
  };
}

export async function updateBusiness(
  businessId: string,
  input: BusinessPayload,
): Promise<UpdateBusinessResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = updateBusinessSchema.safeParse({
    businessId,
    ...input,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const user = await requireUser();
  const existingBusiness = await getPrimaryBusiness(user.id);

  if (!existingBusiness || existingBusiness.id !== businessId) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: BUSINESS_MESSAGES.notFound,
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update(mapPayloadToRow(parsed.data))
    .eq("id", businessId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: error?.message || BUSINESS_MESSAGES.genericError,
      },
    };
  }

  revalidateBusinessPaths();

  return {
    success: true,
    data: mapBusinessToProfile(data),
  };
}

function isAllowedLogoType(type: string): boolean {
  return ALLOWED_BUSINESS_LOGO_TYPES.includes(
    type as (typeof ALLOWED_BUSINESS_LOGO_TYPES)[number],
  );
}

async function removeExistingLogo(storagePath: string | null): Promise<void> {
  if (!storagePath) {
    return;
  }

  const supabase = await createClient();
  await supabase.storage.from(BUSINESS_LOGOS_BUCKET).remove([storagePath]);
}

export async function uploadBusinessLogo(
  businessId: string,
  file: File,
): Promise<UploadBusinessLogoResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  if (!isAllowedLogoType(file.type)) {
    return {
      success: false,
      error: {
        code: "LOGO_INVALID",
        message: BUSINESS_MESSAGES.logoInvalidType,
      },
    };
  }

  if (file.size > MAX_BUSINESS_LOGO_SIZE_BYTES) {
    return {
      success: false,
      error: {
        code: "LOGO_INVALID",
        message: BUSINESS_MESSAGES.logoTooLarge,
      },
    };
  }

  const user = await requireUser();
  const existingBusiness = await getPrimaryBusiness(user.id);

  if (!existingBusiness || existingBusiness.id !== businessId) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: BUSINESS_MESSAGES.notFound,
      },
    };
  }

  const extension = getBusinessLogoExtension(file.type);
  const storagePath = buildBusinessLogoPath(user.id, businessId, extension);
  const supabase = await createClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUSINESS_LOGOS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      success: false,
      error: {
        code: "LOGO_UPLOAD_FAILED",
        message: uploadError.message || BUSINESS_MESSAGES.logoGenericError,
      },
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUSINESS_LOGOS_BUCKET).getPublicUrl(storagePath);

  const logoUrl = `${publicUrl}?v=${Date.now()}`;

  const { data, error: updateError } = await supabase
    .from("businesses")
    .update({ logo_url: logoUrl })
    .eq("id", businessId)
    .eq("user_id", user.id)
    .select("logo_url")
    .single();

  if (updateError || !data?.logo_url) {
    await removeExistingLogo(storagePath);

    return {
      success: false,
      error: {
        code: "LOGO_UPLOAD_FAILED",
        message: updateError?.message || BUSINESS_MESSAGES.logoGenericError,
      },
    };
  }

  revalidateBusinessPaths();

  return {
    success: true,
    data: {
      logoUrl: data.logo_url,
    },
  };
}
