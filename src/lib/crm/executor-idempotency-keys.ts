import { createHash } from "crypto";

export function buildCrmActionIdempotencyKey(input: {
  conversationId?: string | null;
  clientMessage: string;
  actionType: string;
  actionFingerprint: string;
}): string {
  const conversationPart = input.conversationId?.trim() || "no-conversation";
  const digest = createHash("sha256")
    .update(
      `${conversationPart}:${input.clientMessage.trim()}:${input.actionType}:${input.actionFingerprint.trim()}`,
    )
    .digest("hex")
    .slice(0, 24);

  return `${conversationPart}:${input.actionType}:${digest}`;
}

export function buildExecutorPlanIdempotencyKey(input: {
  conversationId?: string | null;
  clientMessage: string;
}): string {
  const conversationPart = input.conversationId?.trim() || "no-conversation";
  const digest = createHash("sha256")
    .update(`${conversationPart}:${input.clientMessage.trim()}`)
    .digest("hex")
    .slice(0, 32);

  return `plan:${conversationPart}:${digest}`;
}
