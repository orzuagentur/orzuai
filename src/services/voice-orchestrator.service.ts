import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatCalendarResourcesForAiPrompt,
  getBusinessBookingSetup,
  listBusinessCalendarResources,
} from "@/services/business-calendar-setup.service";
import {
  formatBookingPagesForAiPrompt,
  isCalendarBookingEnabled,
} from "@/services/ai-calendar-booking.service";
import { formatAvailabilityForAiPrompt } from "@/services/calendar-availability.service";
import { listPublishedBookingPagesForBusinessAdmin } from "@/services/booking-pages.service";
import { isPlatformFeatureAllowed } from "@/services/platform-business-controls.service";
import { runAutoReplyOrchestrator } from "@/services/ai-orchestrator.service";
import {
  applyPreparedExecutorPlan,
  loadContactSnapshot,
} from "@/services/agent-task-executor.service";
import {
  applyAgentPermissionsToPlan,
  resolveAssistantProfile,
} from "@/services/auto-reply-pipeline.service";
import { logOrchestratorAgentRun } from "@/services/agent-run-log.service";
import { orchestratorResponseToExecutorPlan } from "@/types/ai-orchestrator.types";
import { getConversationRepository } from "@/repositories/conversation.repository";
import type { VoiceCallSessionTurn } from "@/repositories/voice.repository";

export async function scheduleVoiceTurnOrchestration(input: {
  businessId: string;
  callerPhone: string;
  clientMessage: string;
  conversationHistory: VoiceCallSessionTurn[];
}): Promise<void> {
  void runVoiceTurnOrchestration(input).catch((error) => {
    console.warn(
      "[voice-orchestrator] background orchestration failed",
      JSON.stringify({
        businessId: input.businessId,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  });
}

async function runVoiceTurnOrchestration(input: {
  businessId: string;
  callerPhone: string;
  clientMessage: string;
  conversationHistory: VoiceCallSessionTurn[];
}): Promise<void> {
  if (!(await isPlatformFeatureAllowed(input.businessId, "voice"))) {
    return;
  }

  const admin = createAdminClient();
  const conversationRepo = getConversationRepository(admin);
  const contactId = await conversationRepo.findContactIdByPhone(
    input.businessId,
    input.callerPhone,
  );

  if (!contactId) {
    return;
  }

  const profile = await resolveAssistantProfile(admin, input.businessId);
  const contact = await loadContactSnapshot(
    admin,
    input.businessId,
    contactId,
  );

  const calendarConnection = await admin
    .from("google_calendar_connections")
    .select("google_calendar_status")
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const calendarConnected =
    calendarConnection.data?.google_calendar_status === "connected";

  const [bookingSetup, calendarResources, bookingPages, calendarBookingEnabled] =
    await Promise.all([
      getBusinessBookingSetup(input.businessId),
      listBusinessCalendarResources(input.businessId),
      listPublishedBookingPagesForBusinessAdmin(input.businessId),
      isCalendarBookingEnabled(input.businessId),
    ]);
  const bookableResourcesText = formatCalendarResourcesForAiPrompt(
    calendarResources,
    bookingSetup,
  );
  const bookingPagesText = formatBookingPagesForAiPrompt(bookingPages);
  const availabilityText = calendarBookingEnabled
    ? await formatAvailabilityForAiPrompt(input.businessId)
    : "";

  const conversationHistory = input.conversationHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const orchestrationResult = await runAutoReplyOrchestrator({
    businessId: input.businessId,
    message: input.clientMessage,
    conversationHistory,
    contact,
    calendarBookingEnabled,
    googleCalendarConnected: calendarConnected,
    bookableResourcesText,
    bookingPagesText,
    availabilityText,
  });

  if (!orchestrationResult.success) {
    await logOrchestratorAgentRun(admin, {
      businessId: input.businessId,
      conversationId: null,
      contactId,
      channel: "voice",
      clientMessage: input.clientMessage,
      success: false,
      errorMessage: `[${orchestrationResult.errorCode}] ${orchestrationResult.errorMessage}`,
    });
    return;
  }

  await applyPreparedExecutorPlan({
    admin,
    businessId: input.businessId,
    contactId,
    conversationId: null,
    channel: "voice",
    clientMessage: input.clientMessage,
    agent: null,
    routingMethod: "none",
    plan: applyAgentPermissionsToPlan(
      orchestratorResponseToExecutorPlan(orchestrationResult.data),
      profile,
    ),
  });
}
