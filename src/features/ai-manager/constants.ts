export const AI_MANAGER_MESSAGES = {
  pageTitle: "My Assistant",
  pageDescription:
    "Connect your assistant to talk with customers automatically. Turn it on or off for each channel. AI Agents are optional and used for lead capture, tasks, and automations.",
  setupTitle: "Set up your business",
  setupDescription:
    "Create your business profile to enable My Assistant for your channels.",
  summaryTitle: "Overview",
  summaryEnabled: (count: number, total: number) =>
    `${count} of ${total} channels active`,
  summaryAllOff: "My Assistant is off on all channels.",
  enableAll: "Enable all channels",
  disableAll: "Disable all channels",
  channelConnected: "Connected",
  channelNotConnected: "Not connected",
  channelAiOn: "Assistant on",
  channelAiOff: "Assistant off",
  configure: "Configure",
  hideSettings: "Hide settings",
  connectChannel: "Connect channel",
  knowledgeHint:
    "Add FAQs and policies in Knowledge Base so My Assistant answers accurately.",
  advancedAgentsHint:
    "Need keyword routing or multiple agents? Use AI Agents for advanced setup.",
  toggleSuccessOn: "My Assistant enabled for this channel.",
  toggleSuccessOff: "My Assistant disabled for this channel.",
  toggleAllOn: "My Assistant enabled on all channels.",
  toggleAllOff: "My Assistant disabled on all channels.",
} as const;
