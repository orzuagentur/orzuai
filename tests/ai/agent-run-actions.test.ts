import { describe, expect, it } from "vitest";

import {
  classifyAgentRunActions,
  formatMetaIntent,
  parseAgentRunAction,
} from "@/lib/ai/agent-run-actions";
import {
  buildCrmActionIdempotencyKey,
  buildExecutorPlanIdempotencyKey,
} from "@/lib/crm/executor-idempotency-keys";

describe("executor idempotency keys", () => {
  it("builds stable plan keys for the same conversation turn", () => {
    const input = {
      conversationId: "conv-1",
      clientMessage: "Hello",
    };

    expect(buildExecutorPlanIdempotencyKey(input)).toBe(
      buildExecutorPlanIdempotencyKey(input),
    );
  });

  it("builds different keys for different messages", () => {
    expect(
      buildExecutorPlanIdempotencyKey({
        conversationId: "conv-1",
        clientMessage: "A",
      }),
    ).not.toBe(
      buildExecutorPlanIdempotencyKey({
        conversationId: "conv-1",
        clientMessage: "B",
      }),
    );
  });

  it("scopes CRM action keys by action type and fingerprint", () => {
    const base = {
      conversationId: "conv-1",
      clientMessage: "book me",
    };

    const a = buildCrmActionIdempotencyKey({
      ...base,
      actionType: "create_task",
      actionFingerprint: "Follow up",
    });
    const b = buildCrmActionIdempotencyKey({
      ...base,
      actionType: "create_deal",
      actionFingerprint: "Follow up",
    });

    expect(a).not.toBe(b);
  });
});

describe("agent run action parsing", () => {
  it("parses meta intent markers", () => {
    const raw = formatMetaIntent("booking");
    const parsed = parseAgentRunAction(raw);

    expect(parsed.kind).toBe("meta");
    expect(parsed.label).toContain("booking");
  });

  it("classifies executed and blocked actions", () => {
    const classified = classifyAgentRunActions([
      formatMetaIntent("sales"),
      "executed:Deal created",
      "blocked:permission:create_calendar_event",
      "skipped:duplicate:create_task",
    ]);

    expect(classified.meta).toHaveLength(1);
    expect(classified.executed).toHaveLength(1);
    expect(classified.blocked).toHaveLength(1);
    expect(classified.skipped).toHaveLength(1);
  });
});
