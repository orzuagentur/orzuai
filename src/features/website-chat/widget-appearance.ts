export const WEBSITE_CHAT_LAUNCHER_ICONS = [
  "message",
  "chat",
  "headset",
  "help",
] as const;

export type WebsiteChatLauncherIcon = (typeof WEBSITE_CHAT_LAUNCHER_ICONS)[number];

export const WEBSITE_CHAT_POSITIONS = [
  "bottom_right",
  "bottom_left",
  "top_right",
  "top_left",
] as const;

export type WebsiteChatPosition = (typeof WEBSITE_CHAT_POSITIONS)[number];

export const WEBSITE_CHAT_DEFAULT_APPEARANCE = {
  widgetTitle: "Chat with us",
  welcomeMessage: "Hi! How can we help you today?",
  primaryColor: "#6366f1",
  launcherIcon: "message" as WebsiteChatLauncherIcon,
  position: "bottom_right" as WebsiteChatPosition,
};

export const WEBSITE_CHAT_LAUNCHER_ICON_OPTIONS: Array<{
  id: WebsiteChatLauncherIcon;
  label: string;
}> = [
  { id: "message", label: "Message" },
  { id: "chat", label: "Chat" },
  { id: "headset", label: "Support" },
  { id: "help", label: "Help" },
];

export const WEBSITE_CHAT_POSITION_OPTIONS: Array<{
  id: WebsiteChatPosition;
  label: string;
  description: string;
}> = [
  {
    id: "bottom_right",
    label: "Bottom right",
    description: "Recommended default for most websites.",
  },
  {
    id: "bottom_left",
    label: "Bottom left",
    description: "Good when your main CTA is on the right.",
  },
  {
    id: "top_right",
    label: "Top right",
    description: "Visible without scrolling on long pages.",
  },
  {
    id: "top_left",
    label: "Top left",
    description: "Alternative corner placement.",
  },
];

export function isWebsiteChatLauncherIcon(value: string): value is WebsiteChatLauncherIcon {
  return (WEBSITE_CHAT_LAUNCHER_ICONS as readonly string[]).includes(value);
}

export function isWebsiteChatPosition(value: string): value is WebsiteChatPosition {
  return (WEBSITE_CHAT_POSITIONS as readonly string[]).includes(value);
}
