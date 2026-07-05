export type AgentCrmPreview = {
  intent: string;
  confidence: number;
  plannedActions: string[];
  blockedActions: string[];
  contactUpdates: string[];
  clientSummary: string | null;
  managerAlert: boolean;
  handoffConfirmed: boolean;
};

export type AssistantAgentTestResult =
  | {
      success: true;
      reply: string;
      model: string;
      provider: string;
      crmPreview: AgentCrmPreview | null;
    }
  | { success: false; message: string };
