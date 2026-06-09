"use client";

import { useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MicIcon,
  PlayIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { useChatMediaUrl } from "@/hooks/use-chat-media-url";
import { cn } from "@/lib/utils";
import {
  formatMediaFileSize,
  type ChatMediaPayload,
} from "@/utils/chat-media";

type ChatMediaMessageProps = {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
};

function MediaLoadingPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] min-w-[180px] items-center justify-center rounded-lg bg-black/5",
        className,
      )}
    >
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function MediaErrorPlaceholder({
  fileName,
  className,
}: {
  fileName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[80px] min-w-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      <ImageIcon className="size-5 opacity-50" />
      <span>{fileName || "Attachment"}</span>
      <span>{CHAT_MESSAGES.mediaLoadFailed}</span>
    </div>
  );
}

function getDocumentIcon(mimeType: string) {
  if (mimeType.includes("pdf") || mimeType.includes("text")) {
    return FileTextIcon;
  }

  return FileIcon;
}

function CaptionText({
  caption,
  isOutgoing,
}: {
  caption?: string;
  isOutgoing?: boolean;
}) {
  if (!caption) {
    return null;
  }

  return (
    <p
      className={cn(
        "px-1 pt-1.5 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]",
        isOutgoing ? "text-inherit" : "text-foreground",
      )}
    >
      {caption}
    </p>
  );
}

function ChatMediaImage({
  media,
  caption,
  isOutgoing,
  resolvedUrl,
  isLoading,
  hasError,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder className="max-w-[min(280px,100%)]" />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (hasError || !resolvedUrl) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative block max-w-[min(280px,100%)] overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        aria-label={CHAT_MESSAGES.openMediaPreview}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={media.fileName}
          loading="lazy"
          className="max-h-72 w-full object-contain bg-black/5 transition-opacity group-hover:opacity-95"
        />
      </button>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[95vh] max-w-[95vw] items-center justify-center border-none bg-black/95 p-2 sm:max-w-[95vw]"
        >
          <DialogTitle className="sr-only">{media.fileName}</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/10"
            onClick={() => setLightboxOpen(false)}
            aria-label={CHAT_MESSAGES.closeMediaPreview}
          >
            <XIcon className="size-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedUrl}
            alt={media.fileName}
            className="max-h-[88vh] max-w-full object-contain"
          />
        </DialogContent>
      </Dialog>

      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

function ChatMediaVideo({
  media,
  caption,
  isOutgoing,
  resolvedUrl,
  isLoading,
  hasError,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder className="max-w-[min(300px,100%)]" />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (hasError || !resolvedUrl) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative max-w-[min(300px,100%)] overflow-hidden rounded-lg bg-black">
        <video
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full object-contain"
        >
          <source src={resolvedUrl} type={media.mimeType} />
        </video>
        <div className="pointer-events-none absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          <VideoIcon className="mr-1 inline size-3" />
          {formatMediaFileSize(media.sizeBytes) || "Video"}
        </div>
      </div>
      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

function ChatMediaAudio({
  media,
  caption,
  isOutgoing,
  resolvedUrl,
  isLoading,
  hasError,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder className="h-12 min-h-0 w-[min(260px,100%)]" />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (hasError || !resolvedUrl) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex min-w-[220px] max-w-[min(280px,100%)] items-center gap-2 rounded-full px-3 py-2",
          isOutgoing ? "bg-emerald-700/40" : "bg-muted/80",
        )}
      >
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isOutgoing ? "bg-emerald-800/60" : "bg-background",
          )}
        >
          <MicIcon className="size-4" />
        </div>
        <audio controls preload="metadata" className="h-8 min-w-0 flex-1">
          <source src={resolvedUrl} type={media.mimeType} />
        </audio>
      </div>
      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

function ChatMediaDocument({
  media,
  caption,
  isOutgoing,
  resolvedUrl,
  isLoading,
  hasError,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const DocIcon = getDocumentIcon(media.mimeType);
  const sizeLabel = formatMediaFileSize(media.sizeBytes);

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex min-w-[220px] max-w-[min(300px,100%)] items-center gap-3 rounded-lg border px-3 py-2.5",
          isOutgoing ? "border-emerald-400/30 bg-emerald-800/20" : "border-border bg-muted/30",
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isOutgoing ? "bg-emerald-800/40" : "bg-background",
          )}
        >
          <DocIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{media.fileName}</p>
          {sizeLabel ? (
            <p className="text-xs text-muted-foreground">{sizeLabel}</p>
          ) : null}
        </div>
        {isLoading ? (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : resolvedUrl && !hasError ? (
          <a
            href={resolvedUrl}
            download={media.fileName}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              isOutgoing
                ? "bg-emerald-800/50 hover:bg-emerald-800/70"
                : "bg-background hover:bg-muted",
            )}
            aria-label={CHAT_MESSAGES.downloadAttachment}
          >
            <DownloadIcon className="size-4" />
          </a>
        ) : (
          <PlayIcon className="size-4 shrink-0 opacity-30" />
        )}
      </div>
      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

export function ChatMediaMessage({
  media,
  caption,
  isOutgoing = false,
}: ChatMediaMessageProps) {
  const { url, isLoading, error } = useChatMediaUrl(media);

  if (!media.path && !media.url) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  const shared = {
    media,
    caption,
    isOutgoing,
    resolvedUrl: url,
    isLoading,
    hasError: error,
  };

  if (media.kind === "image") {
    return <ChatMediaImage {...shared} />;
  }

  if (media.kind === "video") {
    return <ChatMediaVideo {...shared} />;
  }

  if (media.kind === "audio") {
    return <ChatMediaAudio {...shared} />;
  }

  return <ChatMediaDocument {...shared} />;
}
