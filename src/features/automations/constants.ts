import type { AutomationRuleId } from "@/features/automations/rule-catalog";

export const AUTOMATION_TRIGGERS = [
  { id: "new_message", label: "New message received" },
  { id: "form_submit", label: "Website form submitted" },
  { id: "no_reply_24h", label: "No customer reply for 24 hours" },
  { id: "tag_added", label: "Contact tag added" },
] as const;

export const AUTOMATION_ACTIONS = [
  { id: "send_message", label: "Send AI message" },
  { id: "create_task", label: "Create CRM task" },
  { id: "update_stage", label: "Update pipeline stage" },
  { id: "notify", label: "Notify team" },
] as const;

export const AUTOMATION_RECIPES = [
  {
    id: "never_miss_lead",
    name: "Never miss a lead",
    description: "Turn on 24h and 48h AI follow-ups when customers go quiet.",
    ruleIds: ["follow_up"] as AutomationRuleId[],
  },
  {
    id: "auto_qualify_buyers",
    name: "Auto-qualify buyers",
    description: "Score inbound messages and move hot leads to Qualified.",
    ruleIds: ["lead_scoring", "auto_qualify"] as AutomationRuleId[],
  },
  {
    id: "hot_lead_task",
    name: "Hot lead → CRM task",
    description: "Create a team task when high-intent keywords appear.",
    ruleIds: ["crm_auto_task"] as AutomationRuleId[],
  },
] as const;

export const AUTOMATIONS_MESSAGES = {
  pageTitle: "Automations",
  pageDescription:
    "Set what happens automatically when customers message, submit forms, or go quiet.",
  tabOverview: "Overview",
  tabRules: "Rules",
  tabActivity: "Activity",
  usageChip: (used: number, limit: number) => `${used}/${limit} AI replies`,
  enableRecommended: "Enable recommended",
  enableRecipe: "Enable",
  enableAllRecipes: "Enable all 3",
  recommendedTitle: "Recommended for your business",
  recommendedIntro:
    "One-click presets that turn on proven rules using your existing AI setup.",
  runningNowTitle: "What's running now",
  runningNowEmpty: "No rules are active yet. Enable a recipe or turn on a rule.",
  statsFollowUps: "Follow-ups sent",
  statsQualified: "Qualified contacts",
  statsTasks: "CRM tasks",
  statsActiveRules: "Active rules",
  selectRule: "Select a rule to configure it.",
  selectRuleHint:
    "Rules run on every connected channel when AI is enabled in Inbox.",
  configureAgentsLink: "Configure reply style in AI Agents",
  viewInboxLink: "View in Inbox",
  viewCrmLink: "View in CRM",
  liveBadge: "Live",
  pausedBadge: "Paused",
  ruleSaved: "Rule updated.",
  ruleSaveFailed: "Unable to update rule.",
  stackEnabled: "Recommended automations are now active.",
  stackEnableFailed: "Unable to enable recommended automations.",
  saveFailed: "Unable to save automation.",
  noBusiness: "Business not found.",
  activityTitle: "Recent automation activity",
  activityEmpty:
    "No automation events yet. Activity appears after follow-ups, qualifications, or tasks run.",
  activityFollowUp: "Follow-up",
  activityTask: "CRM task",
  activityQualified: "Qualified",
  activityWorkflow: "Workflow",
  followUpSentStat: (count: number) =>
    `${count} follow-up${count === 1 ? "" : "s"} sent total`,
  sentimentLabel: "Sentiment analysis",
  sentimentHint: "Analyze customer tone on every inbound message.",
  bantThresholdLabel: "BANT score threshold",
  autoQualifyLabel: "Auto-move to Qualified pipeline",
  autoTaskEnabled: "Create CRM task on high intent",
  autoTaskThresholdLabel: "Minimum score for auto-task",
  followUpChannelsHint:
    "Runs on connected channels when AI is enabled in Inbox.",
  followUpAgentLabel: "AI agent for follow-ups",
  followUpAgentDefault: "Default generic follow-up",
  followUpAgentDefaultHint:
    "Uses a built-in follow-up style. Pick an agent to match your brand voice.",
  followUpAgentSelectedHint:
    "Follow-up messages use this agent's instructions and model.",
  channelsLabel: "Channels",
  channelsConnectedHint: "Green dot = connected. Rules only run on connected channels.",
  emptyActivityTitle: "No automation activity yet",
  emptyActivityDescription:
    "Follow-ups, pipeline updates, and CRM tasks will appear here after rules run.",
  emptyRulesTitle: "Choose a rule",
  emptyRulesDescription:
    "Select a rule on the left to configure triggers, channels, and actions.",
  emptyOverviewRulesTitle: "No automations running",
  emptyOverviewRulesDescription:
    "Turn on a recommended preset or enable rules in the Rules tab.",
  leadScoringRequiresAgent:
    "Lead scoring runs when the Sales Agent rule is enabled.",
  autoQualifyRequiresScoring:
    "Requires Lead Scoring to be enabled.",
  crmTaskRequiresScoring:
    "Requires Lead Scoring to be enabled.",
  customBadge: "Custom",
  newWorkflow: "New workflow",
  workflowsSection: "Custom workflows",
  workflowsEmpty: "No custom workflows yet. Create one to automate your own triggers.",
  wizardTitle: "Create workflow",
  wizardStep1Title: "When should this run?",
  wizardStep1Description: "Pick the event that starts this workflow.",
  wizardStep2Title: "What should happen?",
  wizardStep2Description: "Choose the action and where it applies.",
  wizardStep3Title: "Review and create",
  wizardStep3Description: "Confirm the name and settings before going live.",
  wizardContinue: "Continue",
  wizardBack: "Back",
  wizardCreate: "Create workflow",
  wizardNameLabel: "Workflow name",
  wizardNamePlaceholder: "e.g. Welcome new form leads",
  workflowSaved: "Workflow saved.",
  workflowDeleted: "Workflow deleted.",
  workflowDelete: "Delete workflow",
  workflowToggleFailed: "Unable to update workflow.",
  workflowChannelsLabel: "Channels",
  workflowChannelsHint: "Leave empty to run on all connected channels.",
  workflowAgentLabel: "AI agent (for Send message)",
  workflowPipelineLabel: "Pipeline stage",
  workflowTaskTitleLabel: "Task title",
  workflowTagLabel: "Tag name (trigger filter)",
  workflowNotifyLabel: "Notification title",
  workflowDetailIntro: "Custom workflow — runs automatically when the trigger fires.",
} as const;
