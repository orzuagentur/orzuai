"use client";

import {
  HeadphonesIcon,
  HelpCircleIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
} from "lucide-react";

import type {
  WebsiteChatLauncherIcon,
  WebsiteChatPosition,
} from "@/features/website-chat/widget-appearance";
import { cn } from "@/lib/utils";

export type WebsiteChatAppearancePreview = {
  widgetTitle: string;
  welcomeMessage: string;
  primaryColor: string;
  launcherIcon: WebsiteChatLauncherIcon;
  position: WebsiteChatPosition;
};

const LAUNCHER_ICON_MAP = {
  message: MessageCircleIcon,
  chat: MessagesSquareIcon,
  headset: HeadphonesIcon,
  help: HelpCircleIcon,
} as const;

const POSITION_CLASS_MAP: Record<WebsiteChatPosition, string> = {
  bottom_right: "bottom-4 right-4 items-end",
  bottom_left: "bottom-4 left-4 items-start",
  top_right: "top-4 right-4 items-end",
  top_left: "top-4 left-4 items-start",
};

type WebsiteChatWidgetPreviewProps = {
  appearance: WebsiteChatAppearancePreview;
  open?: boolean;
  className?: string;
};

export function WebsiteChatWidgetPreview({
  appearance,
  open = true,
  className,
}: WebsiteChatWidgetPreviewProps) {
  const LauncherIcon = LAUNCHER_ICON_MAP[appearance.launcherIcon];
  const isTop = appearance.position.startsWith("top");
  const panelFirst = !isTop;

  const panel = open ? (
    <div className="w-[280px] overflow-hidden rounded-2xl border bg-white shadow-xl">
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: appearance.primaryColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-zinc-300" />
          <span className="truncate">{appearance.widgetTitle}</span>
        </div>
        <span className="text-white/80">×</span>
      </div>
      <div className="space-y-2 bg-slate-50 p-3">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-sm">
          {appearance.welcomeMessage}
        </div>
        <div
          className="ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-xs text-white shadow-sm"
          style={{ backgroundColor: appearance.primaryColor }}
        >
          Hello, I have a question.
        </div>
      </div>
      <div className="flex gap-2 border-t bg-white p-3">
        <div className="h-9 flex-1 rounded-full border bg-slate-50 px-3 text-xs leading-9 text-muted-foreground">
          Type a message…
        </div>
        <div
          className="flex size-9 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: appearance.primaryColor }}
        >
          <MessageCircleIcon className="size-4" />
        </div>
      </div>
    </div>
  ) : null;

  const launcher = (
    <div
      className="flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white/80"
      style={{ backgroundColor: appearance.primaryColor }}
    >
      <LauncherIcon className="size-6" />
    </div>
  );

  return (
    <div
      className={cn(
        "relative h-[360px] overflow-hidden rounded-xl border bg-gradient-to-br from-slate-100 to-slate-200",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 flex h-8 items-center gap-1.5 border-b bg-white/80 px-3">
        <span className="size-2 rounded-full bg-red-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-zinc-400" />
        <span className="ml-2 truncate text-[10px] text-muted-foreground">
          your-website.com
        </span>
      </div>

      <div
        className={cn(
          "absolute flex flex-col gap-3",
          POSITION_CLASS_MAP[appearance.position],
        )}
      >
        {panelFirst ? (
          <>
            {panel}
            {launcher}
          </>
        ) : (
          <>
            {launcher}
            {panel}
          </>
        )}
      </div>
    </div>
  );
}
