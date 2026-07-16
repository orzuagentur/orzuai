import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  filterExecutorPlanByProfile,
  formatActionPreview,
} from "@/lib/ai/tools";
import { runAutoReplyOrchestrator } from "@/services/ai-orchestrator.service";
import {
  formatBookingPagesForAiPrompt,
  isCalendarBookingEnabled,
} from "@/services/ai-calendar-booking.service";
import { formatAvailabilityForAiPrompt } from "@/services/calendar-availability.service";
import {
  formatCalendarResourcesForAiPrompt,
  getBusinessBookingSetup,
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";
import { listPublishedBookingPagesForBusinessAdmin } from "@/services/booking-pages.service";
import {
  generateFastAssistantReply,
  resolveAssistantProfile,
} from "@/services/auto-reply-pipeline.service";
import type {
  AgentCrmPreview,
  AssistantAgentTestResult,
} from "@/types/ai-agent-test.types";
import type { OrchestratorResponse } from "@/types/ai-orchestrator.types";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import type { Database, MessagingChannel } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

function formatContactUpdatesPreview(
  updates: Record<string, unknown> | undefined,
): string[] {
  if (!updates) {
    return [];
  }

  return Object.entries(updates)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }

      return `${key}: ${String(value)}`;
    });
}

function buildCrmPreview(input: {
  orchestration: OrchestratorResponse;
  profile: Awaited<ReturnType<typeof resolveAssistantProfile>>;
}): AgentCrmPreview {
  const rawPlan = orchestratorResponseToExecutorPlan(input.orchestration);
  const filtered = filterExecutorPlanByProfile(rawPlan, input.profile);

  return {
    intent: input.orchestration.intent,
    confidence: input.orchestration.confidence,
    plannedActions: filtered.plan.actions.map((action) =>
      formatActionPreview(action as { type: string } & Record<string, unknown>),
    ),
    blockedActions: filtered.blockedActions,
    contactUpdates: filtered.contactUpdatesBlocked
      ? formatContactUpdatesPreview(rawPlan.contactUpdates)
      : formatContactUpdatesPreview(filtered.plan.contactUpdates),
    clientSummary: input.orchestration.clientSummary?.trim() || null,
    managerAlert: input.orchestration.managerAlert,
    handoffConfirmed: input.orchestration.handoffConfirmed,
  };
}

export async function runAssistantAgentTest(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel?: MessagingChannel;
  clientMessage: string;
  conversationHistory?: ConversationTurn[];
}): Promise<AssistantAgentTestResult> {
  const channel = input.channel ?? "whatsapp";
  const conversationHistory = input.conversationHistory ?? [];

  const phase1 = await generateFastAssistantReply({
    admin: input.admin,
    businessId: input.businessId,
    channel,
    clientMessage: input.clientMessage,
    conversationHistory,
    requireAiEnabled: false,
    skipWorkerActions: true,
  });

  if (!phase1.success) {
    return {
      success: false,
      message:
        phase1.message ??
        "AI Agent could not generate a reply. Check provider configuration.",
    };
  }

  const profile = await resolveAssistantProfile(input.admin, input.businessId);

  const calendarConnection = await input.admin
    .from("google_calendar_connections")
    .select("google_calendar_status")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const googleCalendarConnected =
    calendarConnection.data?.google_calendar_status === "connected";

  const [bookingSetup, calendarResources, bookingPages, calendarBookingEnabled] =
    await Promise.all([
      getBusinessBookingSetup(input.businessId),
      listBusinessCalendarResources(input.businessId),
      listPublishedBookingPagesForBusinessAdmin(input.businessId),
      isCalendarBookingEnabled(input.businessId),
    ]);

  const orchestrationResult = await runAutoReplyOrchestrator({
    businessId: input.businessId,
    message: input.clientMessage,
    conversationHistory,
    contact: null,
    calendarBookingEnabled,
    googleCalendarConnected,
    bookableResourcesText: formatCalendarResourcesForAiPrompt(
      calendarResources,
      bookingSetup,
    ),
    bookingPagesText: formatBookingPagesForAiPrompt(bookingPages),
    availabilityText: calendarBookingEnabled
      ? await formatAvailabilityForAiPrompt(input.businessId)
      : "",
  });

  const crmPreview = orchestrationResult.success
    ? buildCrmPreview({
        orchestration: orchestrationResult.data,
        profile,
      })
    : null;

  return {
    success: true,
    reply: phase1.text,
    model: phase1.model,
    provider: phase1.provider,
    crmPreview,
  };
}
