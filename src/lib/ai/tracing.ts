export type AiPipelineStep =
  | "debounce"
  | "context_build"
  | "knowledge"
  | "llm_fast"
  | "send"
  | "orchestrator"
  | "executor"
  | "orchestration_queue";

export function logAiPipelineStep(input: {
  step: AiPipelineStep;
  businessId: string;
  conversationId?: string | null;
  channel?: string;
  durationMs?: number;
  success?: boolean;
  detail?: string;
}): void {
  console.info(
    "[ai-pipeline]",
    JSON.stringify({
      step: input.step,
      businessId: input.businessId,
      conversationId: input.conversationId ?? null,
      channel: input.channel ?? null,
      durationMs: input.durationMs ?? null,
      success: input.success ?? true,
      detail: input.detail ?? null,
      at: new Date().toISOString(),
    }),
  );
}

export async function withAiPipelineStep<T>(
  input: Omit<Parameters<typeof logAiPipelineStep>[0], "durationMs" | "success">,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();

  try {
    const result = await fn();
    logAiPipelineStep({
      ...input,
      durationMs: Date.now() - started,
      success: true,
    });
    return result;
  } catch (error) {
    logAiPipelineStep({
      ...input,
      durationMs: Date.now() - started,
      success: false,
      detail: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
