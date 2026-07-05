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
      clientSummary: plan.clientSummary,
      contactUpdates: contactUpdatesBlocked ? undefined : plan.contactUpdates,
      actions,
    },
    blockedActions,
    contactUpdatesBlocked,
  };
}

/** @deprecated Use filterExecutorPlanByProfile */
export function applyAgentPermissionsToPlan(
  plan: ExecutorPlan,
  profile: AgentToolProfile,
): ExecutorPlan {
  return filterExecutorPlanByProfile(plan, profile).plan;
}
