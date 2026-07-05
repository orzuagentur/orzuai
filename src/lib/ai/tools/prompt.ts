import { AGENT_TOOLS } from "./registry";

export function formatExecutorToolCatalog(): string {
  return AGENT_TOOLS.filter((tool) => !tool.runsWithoutContact)
    .map((tool) => `- ${tool.name}: ${tool.executorHint}`)
    .join("\n");
}

export function formatOrchestratorToolCatalog(): string {
  return AGENT_TOOLS.map(
    (tool) => `- ${tool.name}: ${tool.orchestratorHint}`,
  ).join("\n");
}

export function formatAllowedExecutorActionTypes(): string {
  return [
    ...AGENT_TOOLS.filter((tool) => !tool.runsWithoutContact).map(
      (tool) => tool.name,
    ),
    "contactUpdates",
  ].join(", ");
}

export function formatActionPreview(action: { type: string } & Record<string, unknown>): string {
  const { type, ...rest } = action;
  const details = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      if (typeof value === "object") {
        return `${key}=${JSON.stringify(value)}`;
      }

      return `${key}=${String(value).slice(0, 80)}`;
    })
    .join(", ");

  return details ? `${type} (${details})` : type;
}
