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
import { assertVoiceAiAllowed } from "@/services/entitlement.service";
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
import {
  getVoiceRepository,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";

export async function scheduleVoiceTurnOrchestration(input: {
  businessId: string;
  callerPhone: string;
  callSid?: string | null;
  clientMessage: string;
  conversationHistory: VoiceCallSessionTurn[];
}): Promise<void> {
  const admin = createAdminClient();
  const conversationRepo = getConversationRepository(admin);
  const contactId = await conversationRepo.findContactIdByPhone(
    input.businessId,
    input.callerPhone,
  );

  if (contactId) {
    const conversation = await conversationRepo.findLatestForContact(
      input.businessId,
      contactId,
      "voice",
    );

    if (conversation?.id) {
      const { enqueueAiOrchestrationJob } = await import(
        "@/services/ai-orchestration-queue.service"
      );

      await enqueueAiOrchestrationJob({
        businessId: input.businessId,
        channel: "voice",
        conversationId: conversation.id,
        clientMessage: input.clientMessage,
      }).catch((error) => {
        console.warn(
          "[voice-orchestrator] failed to enqueue CRM orchestration",
          error instanceof Error ? error.message : "unknown",
        );
      });

      return;
    }
  }

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

/** Durable queue worker entry for voice CRM (booking rules preserved). */
export async function runVoiceCrmOrchestrationFromQueue(input: {
  businessId: string;
  conversationId: string;
  clientMessage: string;
  callerPhone?: string | null;
  callSid?: string | null;
  conversationHistory?: VoiceCallSessionTurn[];
}): Promise<void> {
  const admin = createAdminClient();
  const conversationRepo = getConversationRepository(admin);
  const contactId = await conversationRepo.findContactId(
    input.conversationId,
    input.businessId,
  );

  if (!contactId) {
    return;
  }

  const { data: contactRow } = await admin
    .from("contacts")
    .select("phone_number")
    .eq("id", contactId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const callerPhone =
    input.callerPhone?.trim() || contactRow?.phone_number?.trim() || "";

  await runVoiceTurnOrchestration({
    businessId: input.businessId,
    callerPhone,
    callSid: input.callSid ?? null,
    clientMessage: input.clientMessage,
    conversationHistory: input.conversationHistory ?? [],
    conversationId: input.conversationId,
  });
}

async function runVoiceTurnOrchestration(input: {
  businessId: string;
  callerPhone: string;
  callSid?: string | null;
  clientMessage: string;
  conversationHistory: VoiceCallSessionTurn[];
  conversationId?: string | null;
}): Promise<void> {
  if (!(await isPlatformFeatureAllowed(input.businessId, "voice"))) {
    return;
  }

  const voiceEntitlement = await assertVoiceAiAllowed(input.businessId);
  if (!voiceEntitlement.allowed) {
    return;
  }

  const admin = createAdminClient();
  const conversationRepo = getConversationRepository(admin);
  const voiceRepo = getVoiceRepository();
  const contactId = await conversationRepo.findContactIdByPhone(
    input.businessId,
    input.callerPhone,
  );

  if (!contactId) {
    return;
  }

  const callSid = input.callSid?.trim() || null;
  let callLogId: string | null = null;

  if (callSid) {
    const callLog =
      (await voiceRepo.findCallLogByBusinessAndExternalCallId(
        input.businessId,
        callSid,
      )) ?? (await voiceRepo.findCallLogByExternalCallId(callSid));
    callLogId = callLog?.id ?? null;
  }

  const alreadyBookedThisCall = callSid
    ? await voiceRepo.hasBookingEventForCall({
        businessId: input.businessId,
        callLogId,
        callSid,
      })
    : false;

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
  const availabilityText =
    calendarBookingEnabled && !alreadyBookedThisCall
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
    calendarBookingEnabled: calendarBookingEnabled && !alreadyBookedThisCall,
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

  let plan = applyAgentPermissionsToPlan(
    orchestratorResponseToExecutorPlan(orchestrationResult.data),
    profile,
  );

  if (alreadyBookedThisCall) {
    plan = {
      ...plan,
      actions: plan.actions.filter(
        (action) => action.type !== "create_calendar_event",
      ),
    };
  }

  const executorResult = await applyPreparedExecutorPlan({
    admin,
    businessId: input.businessId,
    contactId,
    conversationId: input.conversationId ?? null,
    channel: "voice",
    clientMessage: input.clientMessage,
    agent: null,
    routingMethod: "none",
    plan,
  });

  const booked = executorResult.actionsApplied.some((action) =>
    /^booking confirmed/i.test(action.trim()),
  );

  if (callSid && booked) {
    await voiceRepo.insertCallEvent({
      businessId: input.businessId,
      callLogId,
      callSid,
      eventType: "voice_live.booking.created",
      actorType: "ai",
      payload: {
        contactId,
        actionsApplied: executorResult.actionsApplied,
      },
    });
  }
}
