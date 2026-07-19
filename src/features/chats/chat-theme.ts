import { cn } from "@/lib/utils";

import type { MessagingChannel } from "@/types/database.types";

type ChatThemeId = "whatsapp" | "email";

/**
 * All messenger channels share the WhatsApp-style chat chrome.
 * Email keeps a mail-thread layout.
 */
function resolveThemeId(channel?: MessagingChannel | null): ChatThemeId {
  return channel === "email" ? "email" : "whatsapp";
}

const WHATSAPP = {
  pane: "bg-[#e7ddd2]",
  header: "border-b border-[#d1c7bb] bg-[#f0f2f5]",
  composer: "border-t border-[#d1c7bb] bg-[#f0f2f5]",
  field: "rounded-2xl border border-black/5 bg-white shadow-sm",
  send: "bg-[#00a884] text-white hover:bg-[#008f72]",
  outgoing: "rounded-tr-md bg-[#d9fdd3] text-[#111b21]",
  incoming: "rounded-tl-md bg-white text-[#111b21]",
  meta: "text-[#667781]",
  accent: "#00a884",
  unreadRing: "ring-[#00a884]/35 ring-offset-[#e7ddd2]",
} as const;

const EMAIL = {
  pane: "bg-[#f6f8fc]",
  header: "border-b border-[#e0e3e8] bg-white",
  composer: "border-t border-[#e0e3e8] bg-white",
  field: "rounded-md border border-[#dadce0] bg-white",
  send: "bg-[#1a73e8] text-white hover:bg-[#1765cc]",
  outgoing: "rounded-md border border-[#e0e3e8] bg-[#e8f0fe] text-[#202124]",
  incoming: "rounded-md border border-[#e0e3e8] bg-white text-[#202124]",
  meta: "text-[#5f6368]",
  accent: "#1a73e8",
  unreadRing: "ring-[#1a73e8]/25 ring-offset-[#f6f8fc]",
} as const;

const THEMES = {
  whatsapp: WHATSAPP,
  email: EMAIL,
} as const;

function theme(channel?: MessagingChannel | null) {
  return THEMES[resolveThemeId(channel)];
}

export function getChatPaneClassName(channel?: MessagingChannel | null): string {
  const t = theme(channel);
  if (resolveThemeId(channel) === "email") {
    return t.pane;
  }
  return cn(
    t.pane,
    "[background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.035)_1px,transparent_0)] [background-size:18px_18px]",
  );
}

/** @deprecated Prefer getChatPaneClassName(channel) */
export const chatPaneClassName = getChatPaneClassName("whatsapp");

export function getChatHeaderClassName(channel?: MessagingChannel | null): string {
  return theme(channel).header;
}

/** @deprecated Prefer getChatHeaderClassName(channel) */
export const chatHeaderClassName = getChatHeaderClassName("whatsapp");

export function getChatComposerShellClassName(
  channel?: MessagingChannel | null,
): string {
  return theme(channel).composer;
}

/** @deprecated Prefer getChatComposerShellClassName(channel) */
export const chatComposerShellClassName = getChatComposerShellClassName("whatsapp");

export function getChatComposerFieldClassName(
  channel?: MessagingChannel | null,
): string {
  return theme(channel).field;
}

/** @deprecated Prefer getChatComposerFieldClassName(channel) */
export const chatComposerFieldClassName = getChatComposerFieldClassName("whatsapp");

export function getChatSendButtonClassName(
  channel?: MessagingChannel | null,
): string {
  return theme(channel).send;
}

/** @deprecated Prefer getChatSendButtonClassName(channel) */
export const chatSendButtonClassName = getChatSendButtonClassName("whatsapp");

/** Unified readable icon buttons in chat header / composer (WhatsApp-style). */
export function getChatActionButtonClassName(
  channel?: MessagingChannel | null,
): string {
  if (resolveThemeId(channel) === "email") {
    return "size-9 rounded-full text-[#5f6368] hover:bg-black/[0.06] hover:text-[#202124]";
  }
  return "size-9 rounded-full text-[#54656f] hover:bg-black/[0.06] hover:text-[#111b21]";
}

export function getChatHeaderActionButtonClassName(
  channel?: MessagingChannel | null,
): string {
  if (resolveThemeId(channel) === "email") {
    return "size-8 rounded-full text-[#5f6368] hover:bg-black/[0.06] hover:text-[#202124]";
  }
  return "size-8 rounded-full text-[#54656f] hover:bg-black/[0.06] hover:text-[#111b21]";
}

export function getChatBubbleClassName(input: {
  isOutgoing: boolean;
  isDeleted?: boolean;
  isUnread?: boolean;
  hasMedia?: boolean;
  isAudioMessage?: boolean;
  channel?: MessagingChannel | null;
}): string {
  const {
    isOutgoing,
    isDeleted,
    isUnread,
    hasMedia,
    isAudioMessage,
    channel,
  } = input;
  const t = theme(channel);
  const isEmail = resolveThemeId(channel) === "email";

  return cn(
    isEmail
      ? "w-full min-w-0 max-w-none text-[15px] leading-relaxed shadow-sm"
      : "max-w-[min(85%,28rem)] min-w-0 shrink text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.1)]",
    hasMedia
      ? isAudioMessage
        ? "rounded-2xl px-2 py-1"
        : isEmail
          ? "rounded-md px-3 py-3"
          : "rounded-2xl px-1.5 py-1.5"
      : isEmail
        ? "px-4 py-3"
        : "rounded-2xl px-3 py-2",
    isDeleted
      ? "border border-dashed border-black/10 bg-white/80 text-muted-foreground"
      : isOutgoing
        ? t.outgoing
        : t.incoming,
    isUnread &&
      !isDeleted &&
      !isOutgoing &&
      cn("ring-2 ring-offset-2", t.unreadRing),
  );
}

export function getChatBubbleMetaClassName(
  _isOutgoing: boolean,
  channel?: MessagingChannel | null,
): string {
  return cn(
    "mt-1 flex items-center justify-end gap-1 text-[10px]",
    theme(channel).meta,
  );
}

export function getChatBubbleMutedActionClassName(
  isOutgoing: boolean,
  channel?: MessagingChannel | null,
): string {
  return getChatBubbleMetaClassName(isOutgoing, channel);
}

export function getChatTypingBubbleClassName(
  variant: "incoming" | "outgoing",
  channel?: MessagingChannel | null,
): string {
  const t = theme(channel);
  return cn(
    "inline-flex max-w-[min(85%,20rem)] items-center gap-2 rounded-2xl px-3 py-2 text-xs shadow-sm",
    variant === "outgoing" ? t.outgoing : t.incoming,
    "opacity-90",
  );
}

export function getChatMediaShellClassName(
  isOutgoing: boolean,
  _channel?: MessagingChannel | null,
): string {
  return isOutgoing
    ? "bg-black/5 text-inherit"
    : "bg-black/[0.04] text-inherit";
}

export function getChatMediaPanelClassName(
  isOutgoing: boolean,
  _channel?: MessagingChannel | null,
): string {
  return isOutgoing ? "bg-black/5" : "bg-black/[0.03]";
}

export function getChatMediaCardClassName(
  isOutgoing: boolean,
  _channel?: MessagingChannel | null,
): string {
  return cn(
    "overflow-hidden rounded-xl border border-black/10",
    isOutgoing ? "bg-black/5" : "bg-white/80",
  );
}

export function getChatMessageActionHoverClassName(
  isOutgoing: boolean,
): string {
  return isOutgoing ? "text-[#5f6f78] hover:bg-black/5" : "";
}

export function getChatVoicePlayerClasses(isOutgoing: boolean) {
  return {
    bar: isOutgoing ? "bg-current/65" : "bg-foreground/65",
    barMuted: isOutgoing ? "bg-current/22" : "bg-foreground/18",
    button: isOutgoing
      ? "bg-current/10 text-current hover:bg-current/14"
      : "bg-foreground/10 text-foreground hover:bg-foreground/14",
    duration: "text-current/70",
  };
}

export function getChatMediaDownloadButtonClassName(
  isOutgoing: boolean,
): string {
  return isOutgoing
    ? "bg-black/10 text-inherit hover:bg-black/15"
    : "bg-white hover:bg-black/[0.04]";
}

export function getChatUnreadDividerClassName(
  channel?: MessagingChannel | null,
) {
  if (resolveThemeId(channel) === "email") {
    return {
      line: "bg-[#1a73e8]/30",
      pill: "border-[#1a73e8]/25 bg-white text-[#202124]",
    };
  }
  return {
    line: "bg-[#00a884]/28",
    pill: "border-[#00a884]/25 bg-[#00a884]/8 text-[#008f72]",
  };
}

export const chatUnreadDividerClassName = getChatUnreadDividerClassName("whatsapp");

export const chatAccentProgressClassName = "bg-[#00a884]";

export const chatMicIconShellClassName =
  "bg-[#00a884]/12 text-[#008f72]";

export function isEmailChatChannel(
  channel?: MessagingChannel | null,
): boolean {
  return channel === "email";
}
