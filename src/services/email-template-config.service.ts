import "server-only";

import {
  getEmailFromAddress,
  getEmailFromAddressLabel,
  resolveFromEmailDbValue,
} from "@/lib/email/from-addresses";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type FromCacheEntry = {
  fromEmail: string | null;
  isActive: boolean;
  expires: number;
};

const fromCache = new Map<string, FromCacheEntry>();
const CACHE_TTL_MS = 60_000;

function resolveStoredFromEmail(raw: string | null | undefined): string | null {
  return resolveFromEmailDbValue(raw);
}

async function loadTemplateConfig(
  templateId: string,
): Promise<{ fromEmail: string | null; isActive: boolean }> {
  if (!hasSupabaseEnv()) {
    return { fromEmail: null, isActive: true };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("email_templates")
    .select("from_email, is_active")
    .eq("id", templateId)
    .maybeSingle();

  return {
    fromEmail: resolveStoredFromEmail(data?.from_email ?? null),
    isActive: data?.is_active ?? true,
  };
}

async function getCachedTemplateConfig(templateId: string) {
  const id = templateId.trim();
  const now = Date.now();
  const cached = fromCache.get(id);

  if (cached && cached.expires > now) {
    return cached;
  }

  const config = await loadTemplateConfig(id);
  const entry: FromCacheEntry = {
    fromEmail: config.fromEmail,
    isActive: config.isActive,
    expires: now + CACHE_TTL_MS,
  };
  fromCache.set(id, entry);
  return entry;
}

export function invalidateEmailTemplateConfigCache(templateId?: string): void {
  if (templateId?.trim()) {
    fromCache.delete(templateId.trim());
    return;
  }

  fromCache.clear();
}

export async function getEmailFromAddressForTemplate(
  templateId?: string | null,
): Promise<string> {
  if (!templateId?.trim()) {
    return getEmailFromAddress(templateId);
  }

  const config = await getCachedTemplateConfig(templateId.trim());
  return config.fromEmail ?? getEmailFromAddress(templateId);
}

export async function getEmailFromAddressLabelForTemplate(
  templateId?: string | null,
): Promise<string> {
  if (!templateId?.trim()) {
    return getEmailFromAddressLabel(templateId);
  }

  const config = await getCachedTemplateConfig(templateId.trim());

  if (config.fromEmail) {
    return config.fromEmail;
  }

  return getEmailFromAddressLabel(templateId);
}

export async function isEmailTemplateActive(templateId: string): Promise<boolean> {
  if (!templateId.trim()) {
    return true;
  }

  const config = await getCachedTemplateConfig(templateId.trim());
  return config.isActive;
}
