export function buildVoiceAgentClientIdentity(businessId: string): string {
  return `orzu_agent_${businessId.replace(/-/g, "")}`;
}

export function buildVoiceUserClientIdentity(
  businessId: string,
  userId: string,
): string {
  return `orzu_${businessId.replace(/-/g, "")}_${userId.replace(/-/g, "")}`;
}
