import type { IntegrationChannelId } from "./constants";

export type IntegrationHelpTopic = {
  title: string;
  summary: string;
  body: string[];
};

export const INTEGRATION_CHANNEL_HELP: Partial<
  Record<IntegrationChannelId, IntegrationHelpTopic>
> = {
  website_chat: {
    title: "Website Chat",
    summary: "Live chat widget for your website.",
    body: [
      "Enable Website Chat to get an embed code and a secret connection key.",
      "Paste the embed code before </body> on your site. The key proves requests come from your installation.",
      "When a visitor sends the first message, OrzuX detects your site domain and shows it as Connected site.",
      "Messages appear in Inbox under Website Chat.",
    ],
  },
  website_forms: {
    title: "Lead Forms",
    summary: "Capture form submissions from any website.",
    body: [
      "Each business gets a private Webhook URL and API Key.",
      "Your form must send both: POST to the webhook URL with header X-OrzuAI-Api-Key.",
      "After the first valid submission, OrzuX records the site domain automatically.",
      "Leads appear in Inbox and Contacts.",
    ],
  },
  whatsapp: {
    title: "WhatsApp",
    summary: "Connect WhatsApp Business via 360dialog.",
    body: [
      "You need a WhatsApp Business account approved for API access.",
      "After connecting, inbound WhatsApp messages sync to Inbox.",
      "Turn on AI Assistant per channel when you are ready for auto-replies.",
    ],
  },
  telegram: {
    title: "Telegram",
    summary: "Connect a Telegram bot.",
    body: [
      "Create a bot with @BotFather and paste the token in OrzuX.",
      "Customers message your bot; chats appear in Inbox.",
    ],
  },
  email: {
    title: "Email",
    summary: "Gmail inbox integration.",
    body: [
      "Authorize Gmail with OAuth. OrzuX syncs threads to Inbox.",
      "AI replies use your assistant profile and knowledge base.",
    ],
  },
  sms: {
    title: "SMS",
    summary: "Text messaging via Twilio.",
    body: [
      "Connect Twilio on the Calls page first, then enable SMS here.",
      "Uses the same Twilio number. Two-way SMS threads appear in Inbox.",
    ],
  },
  voice: {
    title: "Calls",
    summary: "AI phone line via Twilio.",
    body: [
      "Authorize Twilio Connect and pick a phone number.",
      "Inbound and outbound calls are logged in Inbox and CRM.",
    ],
  },
};

export const WEBSITE_CHAT_HELP = {
  embedCode: {
    title: "Embed code",
    body: [
      "Copy the full script tag and paste it once before </body> on every page where chat should appear.",
      "Do not share your connection key publicly beyond your site code.",
    ],
  },
  connectionKey: {
    title: "Connection key",
    body: [
      "Secret key that authorizes your widget. It is included in the embed code automatically.",
      "If leaked, regenerate the key and update your site.",
    ],
  },
  connectedSite: {
    title: "Connected site",
    body: [
      "Filled automatically when OrzuX receives the first valid message from your widget.",
      "Shows which domain is linked to this chat.",
    ],
  },
  appearance: {
    title: "Widget appearance",
    body: [
      "Welcome message is shown when a visitor opens chat.",
      "Brand color styles the chat button and header.",
    ],
  },
} as const;

export const LEAD_FORMS_HELP = {
  webhookUrl: {
    title: "Webhook URL",
    body: [
      "Destination URL for form submissions. Use it in WordPress webhook plugins, Zapier, Make, or custom code.",
      "Always send JSON with at least name, email, phone, or message.",
    ],
  },
  apiKey: {
    title: "API key",
    body: [
      "Required secret. Add header: X-OrzuAI-Api-Key: your_key",
      "Requests without a valid key are rejected.",
    ],
  },
  connectedSite: {
    title: "Connected site",
    body: [
      "Detected from the form page URL or Referer on the first successful submission.",
    ],
  },
  followUp: {
    title: "AI follow-up",
    body: [
      "Optional. After a lead arrives, AI can reply on WhatsApp, Email, or Telegram if those channels are connected and the form includes contact details.",
    ],
  },
} as const;

export const LEAD_FORMS_PLATFORM_GUIDES = [
  {
    id: "wordpress",
    label: "WordPress",
    steps: [
      "Install a webhook plugin (WP Webhooks, CF7 add-on, or similar).",
      "Paste your Webhook URL as the destination.",
      "Add header X-OrzuAI-Api-Key with your API key.",
      "Map fields to name, email, phone, message.",
    ],
  },
  {
    id: "html",
    label: "Custom HTML",
    steps: [
      "POST JSON to your Webhook URL on form submit.",
      "Include header X-OrzuAI-Api-Key.",
      "Send name, email, phone, and/or message fields.",
    ],
  },
  {
    id: "shopify",
    label: "Shopify / Zapier",
    steps: [
      "Create a flow that sends HTTP POST to your Webhook URL.",
      "Add the API key header.",
      "Use the JSON field names from the example in setup.",
    ],
  },
] as const;
