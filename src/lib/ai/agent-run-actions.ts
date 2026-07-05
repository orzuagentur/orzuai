import type { ExecutorPlan } from "@/types/agent-executor.types";
import type { AgentToolName } from "@/lib/ai/tools/types";

export type AgentRunActionKind =
  | "planned"
  | "executed"
  | "blocked"
  | "skipped"
  | "failed"
  | "meta";

export type ParsedAgentRunAction = {
  raw: string;
  kind: AgentRunActionKind;
  label: string;
};

const PREFIX_PATTERN =
  /^(planned|executed|blocked|skipped|failed|meta):(.+)$/;

export function formatPlannedAction(actionType: string): string {
  return `planned:${actionType}`;
}

export function formatBlockedAction(
  reason: "permission",
  actionType: AgentToolName | "contact_updates",
): string {
  return `blocked:${reason}:${actionType}`;
}

export function formatSkippedDuplicate(actionType: string): string {
  return `skipped:duplicate:${actionType}`;
}

export function formatFailedBooking(message: string): string {
  return `failed:booking:${message}`;
}

export function formatMetaIntent(intent: string): string {
  return `meta:intent:${intent}`;
}

export function parseAgentRunAction(raw: string): ParsedAgentRunAction {
  const match = PREFIX_PATTERN.exec(raw);

  if (!match) {
    if (raw.startsWith("Booking not confirmed:")) {
      return {
        raw,
        kind: "failed",
        label: raw,
      };
    }

    return {
      raw,
      kind: "executed",
      label: raw,
    };
  }

  const kind = match[1] as AgentRunActionKind;
  const rest = match[2] ?? "";

  if (kind === "blocked") {
    const parts = rest.split(":");
    const actionType = parts.slice(1).join(":") || parts[0] || rest;
    return {
      raw,
      kind,
      label: `Blocked (${parts[0] ?? "permission"}): ${actionType.replace(/_/g, " ")}`,
    };
  }

  if (kind === "skipped") {
    const actionType = rest.replace(/^duplicate:/, "");
    return {
      raw,
      kind,
      label: `Skipped duplicate: ${actionType.replace(/_/g, " ")}`,
    };
  }

  if (kind === "failed") {
    const message = rest.replace(/^booking:/, "");
    return {
      raw,
      kind,
      label: message.startsWith("booking:")
        ? `Booking failed: ${message.replace(/^booking:/, "")}`
        : message,
    };
  }

  if (kind === "planned") {
    return {
      raw,
      kind,
      label: `Planned: ${rest.replace(/_/g, " ")}`,
    };
  }

  if (kind === "meta") {
    return {
      raw,
      kind,
      label: rest.replace(/^intent:/, "Intent: "),
    };
  }

  return {
    raw,
    kind: "executed",
    label: rest,
  };
}

export function buildPlannedActionsFromPlan(plan: ExecutorPlan): string[] {
  const actions: string[] = [];

  if (plan.contactUpdates && Object.keys(plan.contactUpdates).length > 0) {
    actions.push(formatPlannedAction("contact_updates"));
  }

  for (const action of plan.actions) {
    actions.push(formatPlannedAction(action.type));
  }

  return actions;
}

export function classifyAgentRunActions(actions: string[]): {
  planned: ParsedAgentRunAction[];
  executed: ParsedAgentRunAction[];
  blocked: ParsedAgentRunAction[];
  skipped: ParsedAgentRunAction[];
  failed: ParsedAgentRunAction[];
  meta: ParsedAgentRunAction[];
} {
  const parsed = actions.map(parseAgentRunAction);

  return {
    planned: parsed.filter((entry) => entry.kind === "planned"),
    executed: parsed.filter((entry) => entry.kind === "executed"),
    blocked: parsed.filter((entry) => entry.kind === "blocked"),
    skipped: parsed.filter((entry) => entry.kind === "skipped"),
    failed: parsed.filter((entry) => entry.kind === "failed"),
    meta: parsed.filter((entry) => entry.kind === "meta"),
  };
}
