"use server";

import type { AuditLogEntry } from "@/features/audit/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

export async function fetchAuditLogAction(input?: {
  limit?: number;
  businessId?: string;
  action?: string;
  query?: string;
}): Promise<
  | { success: true; entries: AuditLogEntry[]; total: number }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();
    const limit = Math.min(Math.max(input?.limit ?? 100, 1), 300);

    let query = service
      .from("platform_business_admin_audit_log")
      .select(
        "id, business_id, action, actor_email, metadata, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (input?.businessId?.trim()) {
      query = query.eq("business_id", input.businessId.trim());
    }

    if (input?.action?.trim()) {
      query = query.eq("action", input.action.trim());
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, message: error.message };
    }

    const rows = data ?? [];
    const businessIds = [
      ...new Set(
        rows
          .map((row) => row.business_id as string | null)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const businessNames = new Map<string, string>();
    if (businessIds.length > 0) {
      const { data: businesses } = await service
        .from("businesses")
        .select("id, business_name")
        .in("id", businessIds);

      for (const business of businesses ?? []) {
        businessNames.set(business.id as string, business.business_name as string);
      }
    }

    let entries: AuditLogEntry[] = rows.map((row) => ({
      id: row.id as string,
      businessId: (row.business_id as string | null) ?? null,
      businessName: row.business_id
        ? (businessNames.get(row.business_id as string) ?? null)
        : null,
      action: row.action as string,
      actorEmail: row.actor_email as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    }));

    const search = input?.query?.trim().toLowerCase();
    if (search) {
      entries = entries.filter((entry) => {
        const haystack = [
          entry.actorEmail,
          entry.businessName ?? "",
          entry.action,
          JSON.stringify(entry.metadata),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    return {
      success: true,
      entries,
      total: search ? entries.length : (count ?? entries.length),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load audit log.",
    };
  }
}

export async function fetchAuditBusinessOptionsAction(): Promise<
  | { success: true; businesses: Array<{ id: string; name: string }> }
  | { success: false; message: string }
> {
  try {
    await requirePlatformAdmin();
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from("businesses")
      .select("id, business_name")
      .order("business_name", { ascending: true })
      .limit(300);

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      businesses: (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.business_name as string,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to load businesses.",
    };
  }
}
