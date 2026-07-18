import type { ExecutorAction, ExecutorPlan } from "@/types/agent-executor.types";

import { AGENT_TOOL_BY_NAME } from "./registry";
import type { AgentToolName, AgentToolProfile, FilteredExecutorPlan } from "./types";

function isToolPermitted(
  action: ExecutorAction,
  profile: AgentToolProfile,
): boolean {
  const tool = AGENT_TOOL_BY_NAME.get(action.type);

  if (!tool) {
    return false;
  }

  return profile[tool.permission];
}

export function filterExecutorPlanByProfile(
  plan: ExecutorPlan,
  profile: AgentToolProfile,
): FilteredExecutorPlan {
  const blockedActions: AgentToolName[] = [];
  const contactUpdatesBlocked =
    Boolean(plan.contactUpdates && Object.keys(plan.contactUpdates).length > 0) &&
    !profile.canUpdateContact;

  const actions = plan.actions.filter((action) => {
    if (isToolPermitted(action, profile)) {
      return true;
    }

    blockedActions.push(action.type);
    return false;
  });

  return {
    plan: {
      clientSummary: sanitizeBlockedBookingSummary(
        plan.clientSummary,
        blockedActions,
      ),
      contactUpdates: contactUpdatesBlocked ? undefined : plan.contactUpdates,
      actions,
    },
    blockedActions,
    contactUpdatesBlocked,
  };
}

function sanitizeBlockedBookingSummary(
  clientSummary: string | undefined,
  blockedActions: AgentToolName[],
): string | undefined {
  if (!clientSummary?.trim()) {
    return clientSummary;
  }

  if (!blockedActions.includes("create_calendar_event")) {
    return clientSummary;
  }

  // Drop false booking confirmations when calendar tool was not permitted.
  if (
    /\b(booking|reservation|appointment)\b.*\b(confirmed|booked|scheduled)\b/i.test(
      clientSummary,
    ) ||
    /(бронь|бронирование|запись)[\s\S]{0,80}(подтвержд|создан|оформл|забронир)/i.test(
      clientSummary,
    )
  ) {
    return undefined;
  }

  return clientSummary;
}

/** @deprecated Use filterExecutorPlanByProfile */
export function applyAgentPermissionsToPlan(
  plan: ExecutorPlan,
  profile: AgentToolProfile,
): ExecutorPlan {
  return filterExecutorPlanByProfile(plan, profile).plan;
}
