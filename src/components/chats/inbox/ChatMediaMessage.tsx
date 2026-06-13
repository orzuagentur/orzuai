"use client";

import { useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
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
import { VoiceMessagePlayer } from "@/components/chats/inbox/VoiceMessagePlayer";
import { cn } from "@/lib/utils";
import {
  formatMediaFileSize,
  isMediaPendingHydration,
  type ChatMediaPayload,
} from "@/utils/chat-media";

type ChatMediaMessageProps = {
  media: ChatMediaPayload;
  messageId?: string;
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

function MediaDownloadButton({
  url,
  fileName,
  isOutgoing,
  className,
  onClick,
}: {
  url: string;
  fileName: string;
  isOutgoing?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={url}
      download={fileName}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
        isOutgoing
          ? "bg-emerald-800/50 text-white hover:bg-emerald-800/70"
          : "bg-background hover:bg-muted",
        className,
      )}
      aria-label={CHAT_MESSAGES.downloadAttachment}
    >
      <DownloadIcon className="size-4" />
    </a>
  );
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
  messageId,
  caption,
  isOutgoing,
  previewUrl,
  isPreviewLoading,
  previewError,
}: {
  media: ChatMediaPayload;
  messageId?: string;
  caption?: string;
  isOutgoing?: boolean;
  previewUrl: string | null;
  isPreviewLoading: boolean;
  previewError: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [needsFullUrl, setNeedsFullUrl] = useState(false);
  const hasThumb = Boolean(media.thumbPath);
  const shouldLoadFullUrl = lightboxOpen || needsFullUrl || !hasThumb;
  const {
    url: fullUrl,
    isLoading: isFullLoading,
    error: fullError,
  } = useChatMediaUrl(media, {
    messageId,
    enabled: shouldLoadFullUrl,
  });
  const displayUrl =
    previewUrl ??
    fullUrl ??
    (media.url?.startsWith("blob:") ? media.url : null);
  const resolvedFullUrl =
    fullUrl ?? (media.url?.startsWith("blob:") ? media.url : null);
  const isLoading = hasThumb ? isPreviewLoading : isFullLoading || isPreviewLoading;
  const hasError = hasThumb
    ? previewError && !displayUrl
    : (fullError || previewError) && !displayUrl;

  const requestFullUrl = () => {
    setNeedsFullUrl(true);
  };

  if (isLoading && !displayUrl) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder className="max-w-[min(280px,100%)]" />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (hasError || !displayUrl) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="group relative max-w-[min(280px,100%)]">
        <button
          type="button"
          onClick={() => {
            requestFullUrl();
            setLightboxOpen(true);
          }}
          className="block w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          aria-label={CHAT_MESSAGES.openMediaPreview}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={media.fileName}
            className={cn(
              "max-h-72 w-full object-contain bg-black/5 transition-opacity group-hover:opacity-95",
              isLoading && "opacity-80",
            )}
          />
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Loader2Icon className="size-5 animate-spin text-white" />
            </div>
          ) : null}
        </button>
        {!isLoading ? (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <MediaDownloadButton
              url={resolvedFullUrl ?? displayUrl}
              fileName={media.fileName}
              isOutgoing={isOutgoing}
              className="bg-black/55 text-white hover:bg-black/70"
              onClick={requestFullUrl}
            />
          </div>
        ) : null}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[95vh] max-w-[95vw] items-center justify-center border-none bg-black/95 p-2 sm:max-w-[95vw]"
        >
          <DialogTitle className="sr-only">{media.fileName}</DialogTitle>
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <MediaDownloadButton
              url={resolvedFullUrl ?? displayUrl}
              fileName={media.fileName}
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={requestFullUrl}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setLightboxOpen(false)}
              aria-label={CHAT_MESSAGES.closeMediaPreview}
            >
              <XIcon className="size-5" />
            </Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedFullUrl ?? displayUrl}
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
        <div className="absolute top-2 right-2">
          <MediaDownloadButton
            url={resolvedUrl}
            fileName={media.fileName}
            className="bg-black/55 text-white hover:bg-black/70"
          />
        </div>
      </div>
      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

function ChatMediaAudio({
  media,
  messageId,
  caption,
  isOutgoing,
  resolvedUrl,
  isLoading,
  hasError,
}: {
  media: ChatMediaPayload;
  messageId?: string;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const playbackUrl =
    resolvedUrl ??
    (media.url?.startsWith("blob:") ? media.url : null);

  if (hasError && !playbackUrl) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <VoiceMessagePlayer
        src={playbackUrl}
        seed={messageId ?? media.fileName}
        durationSec={media.durationSec}
        isOutgoing={isOutgoing}
        isLoading={isLoading && !playbackUrl}
      />
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
          <MediaDownloadButton
            url={resolvedUrl}
            fileName={media.fileName}
            isOutgoing={isOutgoing}
          />
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
  messageId,
  caption,
  isOutgoing = false,
}: ChatMediaMessageProps) {
  const hasThumb = Boolean(media.thumbPath && media.kind === "image");
  const previewMedia = hasThumb ? { ...media, path: media.thumbPath! } : media;
  const {
    url: previewUrl,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useChatMediaUrl(previewMedia, { messageId });
  const {
    url: resolvedUrl,
    isLoading: isFullLoading,
    error: fullError,
  } = useChatMediaUrl(media, {
    messageId,
    enabled: !hasThumb,
  });
  const isHydrating = isMediaPendingHydration(media);
  const showLoading =
    isHydrating || (hasThumb ? isPreviewLoading : isFullLoading || isPreviewLoading);

  if (!isHydrating && !media.path && !media.url) {
    return (
      <div className="space-y-1">
        <MediaErrorPlaceholder fileName={media.fileName} />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (media.kind === "image") {
    return (
      <ChatMediaImage
        media={media}
        messageId={messageId}
        caption={caption}
        isOutgoing={isOutgoing}
        previewUrl={hasThumb ? previewUrl : resolvedUrl}
        isPreviewLoading={showLoading}
        previewError={hasThumb ? previewError : fullError || previewError}
      />
    );
  }

  const shared = {
    media,
    caption,
    isOutgoing,
    resolvedUrl,
    previewUrl: resolvedUrl,
    isLoading: showLoading,
    hasError: (fullError || previewError) && !isHydrating,
  };

  if (media.kind === "video") {
    return <ChatMediaVideo {...shared} />;
  }

  if (media.kind === "audio") {
    return <ChatMediaAudio {...shared} messageId={messageId} />;
  }

  return <ChatMediaDocument {...shared} />;
}
