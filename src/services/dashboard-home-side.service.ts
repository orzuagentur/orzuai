import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { listDashboardCalendarMarkers } from "@/services/calendar-events.service";
import { getVoiceInboxCalls } from "@/services/voice-inbox.service";
import type { PipelineStage } from "@/types/contact.types";
import type { CrmDealListItem, CrmDealStatus } from "@/types/crm-deal.types";
import type { MessagingChannel } from "@/types/database.types";
import type { VoiceInboxCallListItem } from "@/types/voice-inbox.types";

export type DashboardHomeSideData = {
  eventDayKeys: string[];
  recentCalls: VoiceInboxCallListItem[];
  recentDeals: CrmDealListItem[];
};

async function getRecentDeals(
  businessId: string,
  limit = 3,
): Promise<CrmDealListItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_deals")
    .select(
      `
      id,
      contact_id,
      title,
      value,
      currency,
      stage,
      expected_close_date,
      status,
      is_primary,
      notes,
      created_at,
      contact:contacts(
        name,
        phone_number,
        channel,
        avatar_url
      )
    `,
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).flatMap((row) => {
    const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
    if (!contact) {
      return [];
    }

    return [
      {
        id: row.id as string,
        contactId: row.contact_id as string,
        title: row.title as string,
        value: (row.value as number | null) ?? null,
        currency: (row.currency as string) ?? "EUR",
        stage: row.stage as PipelineStage,
        expectedCloseDate: (row.expected_close_date as string | null) ?? null,
        status: row.status as CrmDealStatus,
        isPrimary: Boolean(row.is_primary),
        notes: (row.notes as string | null) ?? null,
        createdAt: row.created_at as string,
        contactName: contact.name as string,
        contactPhone: contact.phone_number as string,
        contactChannel: contact.channel as MessagingChannel,
        contactAvatarUrl: (contact.avatar_url as string | null) ?? null,
      },
    ];
  });
}

export async function getDashboardHomeSideData(
  businessId: string,
): Promise<DashboardHomeSideData> {
  const [markers, calls, recentDeals] = await Promise.all([
    listDashboardCalendarMarkers(businessId).catch(() => []),
    getVoiceInboxCalls(businessId)
      .then((items) => {
        const withRecording = items.filter((call) =>
          Boolean(call.recordingUrl?.trim()),
        );
        if (withRecording.length > 0) {
          return withRecording.slice(0, 3);
        }
        return items.slice(0, 3);
      })
      .catch(() => []),
    getRecentDeals(businessId, 3).catch(() => []),
  ]);

  return {
    eventDayKeys: [...new Set(markers.map((event) => new Date(event.start).toDateString()))],
    recentCalls: calls,
    recentDeals,
  };
}
