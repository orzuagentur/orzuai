export function buildVoiceAgentClientIdentity(businessId: string): string {
  return `orzu_agent_${businessId.replace(/-/g, "")}`;
}

export function buildVoiceUserClientIdentity(
  businessId: string,
  userId: string,
): string {
  return `orzu_${businessId.replace(/-/g, "")}_${userId.replace(/-/g, "")}`;
}

function formatUuidFromHex(hex: string): string | null {
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    return null;
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Recover business UUID from softphone client identity when webhook URL has no businessId. */
export function parseBusinessIdFromVoiceClientIdentity(
  identity: string | null | undefined,
): string | null {
  const raw = identity?.trim().replace(/^client:/i, "") ?? "";

  if (!raw) {
    return null;
  }

  const agentMatch = raw.match(/^orzu_agent_([0-9a-f]{32})$/i);
  if (agentMatch?.[1]) {
    return formatUuidFromHex(agentMatch[1]);
  }

  const userMatch = raw.match(/^orzu_([0-9a-f]{32})_([0-9a-f]{32})$/i);
  if (userMatch?.[1]) {
    return formatUuidFromHex(userMatch[1]);
  }

  return null;
}
