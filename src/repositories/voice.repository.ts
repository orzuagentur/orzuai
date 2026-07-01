import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database.types";
import type { SaveVoiceAgentSettingsInput, VoiceProvider } from "@/types/voice-agent.types";

type DbClient = SupabaseClient<Database>;

export type VoiceAgentConfigRow =
  Database["public"]["Tables"]["voice_agent_config"]["Row"];

export type VoiceCallLogRow =
  Database["public"]["Tables"]["voice_call_logs"]["Row"];

export type VoiceCallSessionRow =
  Database["public"]["Tables"]["voice_call_sessions"]["Row"];

export type VoiceCallEventRow =
  Database["public"]["Tables"]["voice_call_events"]["Row"];

export type VoiceCallSessionRecord = Pick<
  VoiceCallSessionRow,
  "id" | "business_id" | "call_sid" | "direction" | "turns" | "turn_count"
>;

export type VoiceCallQueueRow =
  Database["public"]["Tables"]["voice_call_queue"]["Row"];

export type VoiceCallMode = "ai" | "human" | "handoff" | "unknown";
export type VoicePostCallJobType =
  | "transcribe"
  | "summarize"
  | "extract_actions"
  | "sync_crm"
  | "booking";

export type VoiceCallLogInsert = {
  businessId: string;
  contactId?: string | null;
  direction: "outbound" | "inbound";
  phoneNumber: string;
  status: string;
  provider: VoiceProvider;
  externalCallId?: string | null;
  triggerReason?: string | null;
  callMode?: VoiceCallMode;
  aiHandled?: boolean;
  humanHandled?: boolean;
  conversationId?: string | null;
  operatorUserId?: string | null;
};

export type VoiceCallLogInboxRow = Pick<
  VoiceCallLogRow,
  | "id"
  | "direction"
  | "phone_number"
  | "status"
  | "provider"
  | "trigger_reason"
  | "created_at"
  | "contact_id"
  | "call_mode"
  | "operator_user_id"
  | "ended_at"
  | "duration_seconds"
  | "ai_handled"
  | "external_call_id"
  | "recording_url"
  | "recording_sid"
  | "conversation_id"
  | "handoff_at"
  | "human_handled"
> & {
  contacts: { id: string; name: string; phone_number: string } | null;
};

export type VoiceCallLogUpdate = {
  status?: string;
  endedAt?: string | null;
  durationSeconds?: number | null;
  aiHandled?: boolean;
  contactId?: string | null;
  recordingUrl?: string | null;
  recordingSid?: string | null;
  conversationId?: string | null;
  handoffAt?: string | null;
  humanHandled?: boolean;
  callMode?: VoiceCallMode;
  operatorUserId?: string | null;
};

export type VoiceCallEventInsert = {
  businessId: string;
  callLogId?: string | null;
  callSid?: string | null;
  eventType: string;
  actorType?: "system" | "ai" | "customer" | "operator" | "twilio";
  actorUserId?: string | null;
  payload?: Json;
};

export type VoicePostCallJobInsert = {
  businessId: string;
  callLogId: string;
  jobType: VoicePostCallJobType;
  payload?: Json;
};

export type VoiceCallSessionTurn = {
  role: "user" | "assistant";
  content: string;
};

export class VoiceRepository {
  constructor(private readonly db: DbClient) {}

  static create(): VoiceRepository {
    return new VoiceRepository(createAdminClient());
  }

  get client(): DbClient {
    return this.db;
  }

  async findConfigByBusinessId(
    businessId: string,
  ): Promise<VoiceAgentConfigRow | null> {
    const { data, error } = await this.db
      .from("voice_agent_config")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async upsertConfig(
    businessId: string,
    input: SaveVoiceAgentSettingsInput,
  ): Promise<{ error: string | null }> {
    const { error } = await this.db.from("voice_agent_config").upsert(
      {
        business_id: businessId,
        enabled: input.enabled,
        provider: input.provider,
        phone_number: input.phoneNumber || null,
        outbound_enabled: input.outboundEnabled,
        inbound_enabled: input.inboundEnabled,
        callback_after_order: input.callbackAfterOrder,
        callback_delay_minutes: input.callbackDelayMinutes,
        outbound_script: input.outboundScript,
        inbound_greeting: input.inboundGreeting,
        retell_agent_id: input.retellAgentId || null,
        vapi_assistant_id: input.vapiAssistantId || null,
        twilio_phone_sid: input.twilioPhoneSid || null,
        ai_enabled: input.aiEnabled ?? true,
        voice_language: input.voiceLanguage ?? "English",
        voice_system_prompt: input.voiceSystemPrompt || null,
      },
      { onConflict: "business_id" },
    );

    return { error: error?.message ?? null };
  }

  async updateAiEnabled(
    businessId: string,
    aiEnabled: boolean,
  ): Promise<{ error: string | null }> {
    const { error } = await this.db
      .from("voice_agent_config")
      .update({ ai_enabled: aiEnabled })
      .eq("business_id", businessId);

    return { error: error?.message ?? null };
  }

  async listRecentCallLogs(
    businessId: string,
    limit = 10,
  ): Promise<
    Pick<
      VoiceCallLogRow,
      | "id"
      | "direction"
      | "phone_number"
      | "status"
      | "provider"
      | "trigger_reason"
      | "created_at"
    >[]
  > {
    const { data, error } = await this.db
      .from("voice_call_logs")
      .select(
        "id, direction, phone_number, status, provider, trigger_reason, created_at",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async insertCallLog(input: VoiceCallLogInsert): Promise<string | null> {
    const externalCallId = input.externalCallId?.trim() || null;

    if (externalCallId) {
      const existing = await this.findCallLogByBusinessAndExternalCallId(
        input.businessId,
        externalCallId,
      );

      if (existing) {
        await this.updateCallLog(existing.id, {
          contactId: input.contactId ?? existing.contact_id,
          conversationId: input.conversationId ?? existing.conversation_id,
          aiHandled: input.aiHandled ?? existing.ai_handled ?? false,
          humanHandled: input.humanHandled,
          callMode: input.callMode,
          operatorUserId: input.operatorUserId,
        });
        return existing.id;
      }
    }

    const { data, error } = await this.db
      .from("voice_call_logs")
      .insert({
        business_id: input.businessId,
        contact_id: input.contactId ?? null,
        call_mode: input.callMode ?? "unknown",
        operator_user_id: input.operatorUserId ?? null,
        direction: input.direction,
        phone_number: input.phoneNumber,
        status: input.status,
        provider: input.provider,
        external_call_id: externalCallId,
        trigger_reason: input.triggerReason ?? null,
        ai_handled: input.aiHandled ?? false,
        human_handled: input.humanHandled ?? false,
        conversation_id: input.conversationId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      if (externalCallId && error.code === "23505") {
        const existing = await this.findCallLogByBusinessAndExternalCallId(
          input.businessId,
          externalCallId,
        );
        return existing?.id ?? null;
      }

      throw new Error(error.message);
    }

    return data?.id ?? null;
  }

  async listCallLogsForInbox(
    businessId: string,
    limit = 50,
  ): Promise<VoiceCallLogInboxRow[]> {
    const { data, error } = await this.db
      .from("voice_call_logs")
      .select(
        `
        id,
        direction,
        phone_number,
        status,
        provider,
        trigger_reason,
        created_at,
        contact_id,
        call_mode,
        operator_user_id,
        ended_at,
        duration_seconds,
        ai_handled,
        external_call_id,
        recording_url,
        recording_sid,
        conversation_id,
        handoff_at,
        human_handled,
        contacts (
          id,
          name,
          phone_number
        )
      `,
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as VoiceCallLogInboxRow[];
  }

  async findCallLogById(
    businessId: string,
    callLogId: string,
  ): Promise<VoiceCallLogInboxRow | null> {
    const { data, error } = await this.db
      .from("voice_call_logs")
      .select(
        `
        id,
        direction,
        phone_number,
        status,
        provider,
        trigger_reason,
        created_at,
        contact_id,
        call_mode,
        operator_user_id,
        ended_at,
        duration_seconds,
        ai_handled,
        external_call_id,
        recording_url,
        recording_sid,
        conversation_id,
        handoff_at,
        human_handled,
        contacts (
          id,
          name,
          phone_number
        )
      `,
      )
      .eq("business_id", businessId)
      .eq("id", callLogId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as VoiceCallLogInboxRow | null) ?? null;
  }

  async findCallLogByExternalCallId(
    externalCallId: string,
  ): Promise<
    Pick<
      VoiceCallLogRow,
      | "id"
      | "business_id"
      | "created_at"
      | "status"
      | "duration_seconds"
      | "contact_id"
      | "phone_number"
      | "conversation_id"
      | "recording_url"
      | "call_mode"
    > | null
  > {
    const { data, error } = await this.db
      .from("voice_call_logs")
      .select(
        "id, business_id, created_at, status, duration_seconds, contact_id, phone_number, conversation_id, recording_url, call_mode",
      )
      .eq("external_call_id", externalCallId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findCallLogByBusinessAndExternalCallId(
    businessId: string,
    externalCallId: string,
  ): Promise<
    Pick<
      VoiceCallLogRow,
      "id" | "contact_id" | "conversation_id" | "ai_handled"
    > | null
  > {
    const { data, error } = await this.db
      .from("voice_call_logs")
      .select("id, contact_id, conversation_id, ai_handled")
      .eq("business_id", businessId)
      .eq("external_call_id", externalCallId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateCallLog(
    callLogId: string,
    patch: VoiceCallLogUpdate,
  ): Promise<void> {
    const updatePayload: Database["public"]["Tables"]["voice_call_logs"]["Update"] =
      {};

    if (patch.status !== undefined) {
      updatePayload.status = patch.status;
    }

    if (patch.endedAt !== undefined) {
      updatePayload.ended_at = patch.endedAt;
    }

    if (patch.durationSeconds !== undefined) {
      updatePayload.duration_seconds = patch.durationSeconds;
    }

    if (patch.aiHandled !== undefined) {
      updatePayload.ai_handled = patch.aiHandled;
    }

    if (patch.contactId !== undefined) {
      updatePayload.contact_id = patch.contactId;
    }

    if (patch.recordingUrl !== undefined) {
      updatePayload.recording_url = patch.recordingUrl;
    }

    if (patch.recordingSid !== undefined) {
      updatePayload.recording_sid = patch.recordingSid;
    }

    if (patch.conversationId !== undefined) {
      updatePayload.conversation_id = patch.conversationId;
    }

    if (patch.handoffAt !== undefined) {
      updatePayload.handoff_at = patch.handoffAt;
    }

    if (patch.humanHandled !== undefined) {
      updatePayload.human_handled = patch.humanHandled;
    }

    if (patch.callMode !== undefined) {
      updatePayload.call_mode = patch.callMode;
    }

    if (patch.operatorUserId !== undefined) {
      updatePayload.operator_user_id = patch.operatorUserId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    const { error } = await this.db
      .from("voice_call_logs")
      .update(updatePayload)
      .eq("id", callLogId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async findSessionByCallSid(
    callSid: string,
  ): Promise<VoiceCallSessionRecord | null> {
    const { data, error } = await this.db
      .from("voice_call_sessions")
      .select("id, business_id, call_sid, direction, turns, turn_count")
      .eq("call_sid", callSid)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async insertCallEvent(input: VoiceCallEventInsert): Promise<void> {
    const { error } = await this.db.from("voice_call_events").insert({
      business_id: input.businessId,
      call_log_id: input.callLogId ?? null,
      call_sid: input.callSid ?? null,
      event_type: input.eventType,
      actor_type: input.actorType ?? "system",
      actor_user_id: input.actorUserId ?? null,
      payload: input.payload ?? {},
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async listCallEvents(
    businessId: string,
    callLogId: string,
    limit = 50,
  ): Promise<VoiceCallEventRow[]> {
    const { data, error } = await this.db
      .from("voice_call_events")
      .select("*")
      .eq("business_id", businessId)
      .eq("call_log_id", callLogId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async enqueuePostCallJob(input: VoicePostCallJobInsert): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.db
      .from("voice_post_call_jobs")
      .insert({
        business_id: input.businessId,
        call_log_id: input.callLogId,
        job_type: input.jobType,
        status: "pending",
        next_attempt_at: now,
        payload: input.payload ?? {},
      });

    if (error) {
      if (error.code === "23505") {
        await this.db
          .from("voice_post_call_jobs")
          .update({
            status: "pending",
            next_attempt_at: now,
            processed_at: null,
            last_error: null,
            payload: input.payload ?? {},
          })
          .eq("business_id", input.businessId)
          .eq("call_log_id", input.callLogId)
          .eq("job_type", input.jobType)
          .in("status", ["skipped", "failed"]);
        return;
      }

      throw new Error(error.message);
    }
  }

  async createSession(input: {
    businessId: string;
    callSid: string;
    direction: "inbound" | "outbound";
  }): Promise<VoiceCallSessionRecord | null> {
    const { data, error } = await this.db
      .from("voice_call_sessions")
      .insert({
        business_id: input.businessId,
        call_sid: input.callSid,
        direction: input.direction,
        turns: [],
        turn_count: 0,
      })
      .select("id, business_id, call_sid, direction, turns, turn_count")
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async updateSessionTurns(input: {
    sessionId: string;
    turns: VoiceCallSessionTurn[];
    turnCount: number;
  }): Promise<void> {
    const { error } = await this.db
      .from("voice_call_sessions")
      .update({
        turns: input.turns,
        turn_count: input.turnCount,
      })
      .eq("id", input.sessionId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async insertQueueItem(input: {
    businessId: string;
    contactId: string;
    phoneNumber: string;
    triggerReason: string;
    executeAt: string;
  }): Promise<void> {
    const { error } = await this.db.from("voice_call_queue").insert({
      business_id: input.businessId,
      contact_id: input.contactId,
      phone_number: input.phoneNumber,
      trigger_reason: input.triggerReason,
      execute_at: input.executeAt,
      status: "pending",
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async listPendingQueueItems(
    now: string,
    limit = 20,
  ): Promise<
    Pick<
      VoiceCallQueueRow,
      "id" | "business_id" | "contact_id" | "phone_number" | "trigger_reason"
    >[]
  > {
    const { data, error } = await this.db
      .from("voice_call_queue")
      .select("id, business_id, contact_id, phone_number, trigger_reason")
      .eq("status", "pending")
      .lte("execute_at", now)
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async claimPendingQueueItems(
    now: string,
    limit = 20,
  ): Promise<
    Pick<
      VoiceCallQueueRow,
      "id" | "business_id" | "contact_id" | "phone_number" | "trigger_reason"
    >[]
  > {
    const pending = await this.listPendingQueueItems(now, limit);
    const ids = pending.map((item) => item.id);

    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.db
      .from("voice_call_queue")
      .update({ status: "processing" })
      .in("id", ids)
      .eq("status", "pending")
      .select("id, business_id, contact_id, phone_number, trigger_reason");

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  async updateQueueItemStatus(
    id: string,
    status: "processing" | "completed" | "failed",
  ): Promise<void> {
    const { error } = await this.db
      .from("voice_call_queue")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export function getVoiceRepository(): VoiceRepository {
  return VoiceRepository.create();
}
