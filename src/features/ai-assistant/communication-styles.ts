export const COMMUNICATION_STYLES = [
  {
    id: "professional",
    label: "Professional",
    description: "Polite, clear, and business-appropriate.",
    instruction:
      "Use a professional, respectful business tone. Be clear and structured.",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm and approachable, like a helpful teammate.",
    instruction:
      "Use a warm, friendly tone. Sound approachable while staying helpful.",
  },
  {
    id: "concise",
    label: "Concise",
    description: "Short replies ideal for chat and SMS.",
    instruction:
      "Keep replies brief and scannable. Prefer short sentences and one question at a time.",
  },
  {
    id: "empathetic",
    label: "Empathetic",
    description: "Supportive and understanding for sensitive topics.",
    instruction:
      "Acknowledge the customer's feelings first. Be patient, supportive, and reassuring.",
  },
] as const;

export type CommunicationStyleId =
  (typeof COMMUNICATION_STYLES)[number]["id"];

export const DEFAULT_COMMUNICATION_STYLE: CommunicationStyleId = "professional";

export function isCommunicationStyleId(
  value: string,
): value is CommunicationStyleId {
  return (COMMUNICATION_STYLES as readonly { id: string }[]).some(
    (style) => style.id === value,
  );
}

export function getCommunicationStyle(
  styleId: string,
): (typeof COMMUNICATION_STYLES)[number] | undefined {
  return COMMUNICATION_STYLES.find((style) => style.id === styleId);
}

export function getCommunicationStyleLabel(styleId: string): string {
  return getCommunicationStyle(styleId)?.label ?? styleId;
}

export function applyCommunicationStyle(
  systemPrompt: string,
  styleId: string,
): string {
  const style = getCommunicationStyle(styleId);

  if (!style) {
    return systemPrompt;
  }

  return `${systemPrompt.trim()}\n\nCommunication style: ${style.instruction}`;
}

export function buildEffectiveAgentPrompt(input: {
  systemPrompt: string;
  communicationStyle?: string | null;
}): string {
  return applyCommunicationStyle(
    input.systemPrompt,
    input.communicationStyle ?? DEFAULT_COMMUNICATION_STYLE,
  );
}
