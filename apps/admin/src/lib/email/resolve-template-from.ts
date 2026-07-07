import {
  getEmailFromAddress,
  getEmailFromAddressLabel,
  resolveFromEmailDbValue,
} from "@orzuai/lib/email/from-addresses";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getAdminTemplateFromAddress(
  templateId?: string | null,
): Promise<string> {
  if (!templateId?.trim()) {
    return getEmailFromAddress(templateId);
  }

  const service = createServiceRoleClient();
  const { data } = await service
    .from("email_templates")
    .select("from_email")
    .eq("id", templateId.trim())
    .maybeSingle();

  return (
    resolveFromEmailDbValue(data?.from_email ?? null) ??
    getEmailFromAddress(templateId)
  );
}

export async function getAdminTemplateFromLabel(
  templateId?: string | null,
): Promise<string> {
  if (!templateId?.trim()) {
    return getEmailFromAddressLabel(templateId);
  }

  const service = createServiceRoleClient();
  const { data } = await service
    .from("email_templates")
    .select("from_email")
    .eq("id", templateId.trim())
    .maybeSingle();

  const resolved = resolveFromEmailDbValue(data?.from_email ?? null);

  if (resolved) {
    return resolved;
  }

  return getEmailFromAddressLabel(templateId);
}
