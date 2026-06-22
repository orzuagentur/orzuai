import { cn } from "@/lib/utils";

/** WhatsApp / Telegram inspired styling — chat column only (messages + header + composer). */

export const chatPaneClassName =
  "bg-[#e8ece9] dark:bg-[#1c252e] [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.022)_1px,transparent_0)] [background-size:20px_20px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.018)_1px,transparent_0)]";

export const chatHeaderClassName =
  "border-b border-black/[0.06] bg-[#f3f4f6] dark:border-white/[0.08] dark:bg-[#252f38]";

export const chatComposerShellClassName =
  "border-t border-black/[0.06] bg-[#f3f4f6] dark:border-white/[0.08] dark:bg-[#252f38]";

export const chatComposerFieldClassName =
  "rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#303d47]";

export const chatSendButtonClassName =
  "bg-[#00a884] text-white hover:bg-[#008f72] dark:bg-[#2aab8e] dark:hover:bg-[#34b896]";

export function getChatBubbleClassName(input: {
  isOutgoing: boolean;
  isDeleted?: boolean;
  isUnread?: boolean;
  hasMedia?: boolean;
  isAudioMessage?: boolean;
}): string {
  const { isOutgoing, isDeleted, isUnread, hasMedia, isAudioMessage } = input;

  return cn(
    "max-w-[min(85%,28rem)] min-w-0 shrink text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.1)] dark:shadow-[0_1px_0.5px_rgba(0,0,0,0.28)]",
    hasMedia
      ? isAudioMessage
        ? "rounded-2xl px-2 py-1"
        : "rounded-2xl px-1.5 py-1.5"
      : "rounded-2xl px-3 py-2",
    isDeleted
      ? "border border-dashed border-black/10 bg-white/80 text-muted-foreground dark:border-white/12 dark:bg-[#2e3b45]/85"
      : isOutgoing
        ? "rounded-tr-md bg-[#d4edd0] text-[#243028] dark:bg-[#1f6656] dark:text-[#e8f0ee]"
        : "rounded-tl-md bg-[#f6f7f7] text-[#243028] dark:bg-[#2e3b45] dark:text-[#e8ecef]",
    isUnread &&
      !isDeleted &&
      !isOutgoing &&
      "ring-2 ring-[#00a884]/30 ring-offset-2 ring-offset-[#e8ece9] dark:ring-[#2aab8e]/40 dark:ring-offset-[#1c252e]",
  );
}

export function getChatBubbleMetaClassName(isOutgoing: boolean): string {
  return cn(
    "mt-1 flex items-center justify-end gap-1 text-[10px]",
    isOutgoing
      ? "text-[#5f6f78] dark:text-[#9ab5ad]"
      : "text-[#5f6f78] dark:text-[#8b9aa6]",
  );
}

export function getChatBubbleMutedActionClassName(isOutgoing: boolean): string {
  return isOutgoing
    ? "text-[#5f6f78] hover:text-[#3b4a54] dark:text-[#9ab5ad] dark:hover:text-[#c8ddd8]"
    : "text-[#5f6f78] dark:text-[#8b9aa6]";
}

export function getChatTypingBubbleClassName(variant: "incoming" | "outgoing"): string {
  return cn(
    "inline-flex max-w-[min(85%,20rem)] items-center gap-2 rounded-2xl px-3 py-2 text-xs shadow-[0_1px_0.5px_rgba(11,20,26,0.1)] dark:shadow-[0_1px_0.5px_rgba(0,0,0,0.28)]",
    variant === "outgoing"
      ? "rounded-tr-md bg-[#d4edd0] text-[#5f6f78] dark:bg-[#1f6656] dark:text-[#9ab5ad]"
      : "rounded-tl-md bg-[#f6f7f7] text-[#5f6f78] dark:bg-[#2e3b45] dark:text-[#8b9aa6]",
  );
}

export function getChatMediaShellClassName(isOutgoing: boolean): string {
  return isOutgoing
    ? "bg-[#c8e6c3] text-[#243028] dark:bg-[#1a5a4c] dark:text-[#e8f0ee]"
    : "bg-black/[0.04] text-[#5f6f78] dark:bg-black/15 dark:text-[#8b9aa6]";
}

export function getChatMediaPanelClassName(isOutgoing: boolean): string {
  return isOutgoing
    ? "bg-[#bddfb8] dark:bg-[#185448]"
    : "bg-[#f6f7f7] dark:bg-[#303d47]";
}

export function getChatMediaCardClassName(isOutgoing: boolean): string {
  return cn(
    "overflow-hidden rounded-xl border",
    isOutgoing
      ? "border-[#a8d4a0]/70 bg-[#c8e6c3]/55 dark:border-[#2aab8e]/22 dark:bg-[#1a5a4c]/65"
      : "border-black/[0.06] bg-[#f6f7f7] dark:border-white/[0.08] dark:bg-[#2e3b45]",
  );
}

export function getChatMessageActionHoverClassName(isOutgoing: boolean): string {
  return isOutgoing
    ? "text-[#5f6f78] hover:bg-[#bddfb8] dark:text-[#9ab5ad] dark:hover:bg-[#185448]"
    : "";
}

export function getChatVoicePlayerClasses(isOutgoing: boolean) {
  return {
    bar: isOutgoing
      ? "bg-[#243028]/65 dark:bg-white/80"
      : "bg-foreground/65",
    barMuted: isOutgoing
      ? "bg-[#243028]/22 dark:bg-white/28"
      : "bg-foreground/18",
    button: isOutgoing
      ? "bg-[#243028]/10 text-[#243028] hover:bg-[#243028]/14 dark:bg-white/18 dark:text-white dark:hover:bg-white/26"
      : "bg-foreground/10 text-foreground hover:bg-foreground/14",
    duration: isOutgoing
      ? "text-[#5f6f78] dark:text-[#9ab5ad]"
      : "text-[#5f6f78] dark:text-[#8b9aa6]",
  };
}

export function getChatMediaDownloadButtonClassName(isOutgoing: boolean): string {
  return isOutgoing
    ? "bg-[#00a884]/14 text-[#243028] hover:bg-[#00a884]/22 dark:bg-white/14 dark:text-white dark:hover:bg-white/22"
    : "bg-white hover:bg-black/[0.04] dark:bg-[#303d47] dark:hover:bg-[#384752]";
}

export const chatUnreadDividerClassName = {
  line: "bg-[#00a884]/28 dark:bg-[#2aab8e]/38",
  pill: "border-[#00a884]/25 bg-[#00a884]/8 text-[#008f72] dark:border-[#2aab8e]/35 dark:bg-[#2aab8e]/12 dark:text-[#5ec9a8]",
};

export const chatAccentProgressClassName = "bg-[#00a884] dark:bg-[#2aab8e]";

export const chatMicIconShellClassName =
  "bg-[#00a884]/12 text-[#008f72] dark:bg-[#2aab8e]/18 dark:text-[#5ec9a8]";
