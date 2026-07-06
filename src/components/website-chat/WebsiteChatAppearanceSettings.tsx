"use client";

import {
  HeadphonesIcon,
  HelpCircleIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
} from "lucide-react";

import { IntegrationHelpTip } from "@/components/integrations/IntegrationHelpTip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEBSITE_CHAT_HELP } from "@/features/integrations/integration-help";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";
import {
  WEBSITE_CHAT_LAUNCHER_ICON_OPTIONS,
  WEBSITE_CHAT_POSITION_OPTIONS,
  type WebsiteChatLauncherIcon,
  type WebsiteChatPosition,
} from "@/features/website-chat/widget-appearance";
import { cn } from "@/lib/utils";

const LAUNCHER_ICON_COMPONENTS = {
  message: MessageCircleIcon,
  chat: MessagesSquareIcon,
  headset: HeadphonesIcon,
  help: HelpCircleIcon,
} as const;

export type WebsiteChatAppearanceFormValues = {
  widgetTitle: string;
  welcomeMessage: string;
  primaryColor: string;
  launcherIcon: WebsiteChatLauncherIcon;
  position: WebsiteChatPosition;
};

type WebsiteChatAppearanceSettingsProps = {
  values: WebsiteChatAppearanceFormValues;
  onChange: (values: WebsiteChatAppearanceFormValues) => void;
};

export function WebsiteChatAppearanceSettings({
  values,
  onChange,
}: WebsiteChatAppearanceSettingsProps) {
  function patch(partial: Partial<WebsiteChatAppearanceFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="wc-title">{WEBSITE_CHAT_MESSAGES.widgetTitleLabel}</Label>
          <IntegrationHelpTip title={WEBSITE_CHAT_HELP.appearance.title}>
            <p>Shown in the chat header when visitors open the widget.</p>
          </IntegrationHelpTip>
        </div>
        <Input
          id="wc-title"
          value={values.widgetTitle}
          maxLength={80}
          onChange={(event) => patch({ widgetTitle: event.target.value })}
          placeholder="Chat with us"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wc-welcome">{WEBSITE_CHAT_MESSAGES.welcomeMessageLabel}</Label>
        <Input
          id="wc-welcome"
          value={values.welcomeMessage}
          maxLength={500}
          onChange={(event) => patch({ welcomeMessage: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wc-color">{WEBSITE_CHAT_MESSAGES.primaryColorLabel}</Label>
        <div className="flex gap-2">
          <Input
            id="wc-color"
            value={values.primaryColor}
            onChange={(event) => patch({ primaryColor: event.target.value })}
            className="font-mono"
          />
          <input
            type="color"
            value={values.primaryColor}
            onChange={(event) => patch({ primaryColor: event.target.value })}
            className="size-10 cursor-pointer rounded-md border"
            aria-label={WEBSITE_CHAT_MESSAGES.primaryColorLabel}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{WEBSITE_CHAT_MESSAGES.launcherIconLabel}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEBSITE_CHAT_LAUNCHER_ICON_OPTIONS.map((option) => {
            const Icon = LAUNCHER_ICON_COMPONENTS[option.id];
            const selected = values.launcherIcon === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-muted/50",
                )}
                onClick={() => patch({ launcherIcon: option.id })}
              >
                <Icon className="size-5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>{WEBSITE_CHAT_MESSAGES.positionLabel}</Label>
          <IntegrationHelpTip title={WEBSITE_CHAT_HELP.position.title}>
            {WEBSITE_CHAT_HELP.position.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </IntegrationHelpTip>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEBSITE_CHAT_POSITION_OPTIONS.map((option) => {
            const selected = values.position === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                )}
                onClick={() => patch({ position: option.id })}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
