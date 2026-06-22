"use client";

import { memo, useEffect, useState, useTransition } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MicIcon,
  PlayIcon,
  RefreshCwIcon,
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
import {
  getChatMediaCardClassName,
  getChatMediaDownloadButtonClassName,
  getChatMediaPanelClassName,
  getChatMediaShellClassName,
} from "@/features/chats/chat-theme";
import { retryInboundMediaAttachmentAction } from "@/features/chats/actions/retry-inbound-media-attachment";
import { hasPersistedMediaBlob } from "@/lib/client-cache/chat-media-blob-cache";
import { useChatImageMediaUrls, useChatMediaUrl } from "@/hooks/use-chat-media-url";
import { resolveCachedMediaUrl } from "@/lib/client-cache/inbox-messenger-cache";
import { VoiceMessagePlayer } from "@/components/chats/inbox/VoiceMessagePlayer";
import { cn } from "@/lib/utils";
import {
  formatMediaFileSize,
  buildMediaUrlCacheKey,
  isMediaPendingHydration,
  resolveMediaStoragePath,
  type ChatMediaKind,
  type ChatMediaPayload,
} from "@/utils/chat-media";

type ChatMediaMessageProps = {
  media: ChatMediaPayload;
  messageId?: string;
  caption?: string;
  isOutgoing?: boolean;
  showDownloadButton?: boolean;
  isHydrating?: boolean;
  isFailed?: boolean;
  onRetryStateChange?: (state: {
    attachmentPending: boolean;
    attachmentFailed: boolean;
  }) => void;
};

function getMediaCacheKeys(
  media: ChatMediaPayload,
  messageId?: string,
): string[] {
  const keys: string[] = [];
  const storagePath = resolveMediaStoragePath(media);
  const cacheKey = buildMediaUrlCacheKey(media, messageId);

  if (storagePath) {
    keys.push(storagePath);
  }

  if (cacheKey && !keys.includes(cacheKey)) {
    keys.push(cacheKey);
  }

  return keys;
}

function hasCachedMediaUrl(
  media: ChatMediaPayload,
  messageId?: string,
): boolean {
  if (media.url?.startsWith("blob:")) {
    return true;
  }

  if (isMediaPendingHydration(media)) {
    return false;
  }

  return Boolean(resolveCachedMediaUrl(getMediaCacheKeys(media, messageId)));
}

function shouldAutoLoadMedia(
  media: ChatMediaPayload,
  messageId?: string,
): boolean {
  return (
    media.kind === "audio" ||
    media.url?.startsWith("blob:") ||
    hasCachedMediaUrl(media, messageId)
  );
}

function MediaLoadPrompt({
  kind,
  fileName,
  isOutgoing,
  onLoad,
  className,
}: {
  kind: ChatMediaKind;
  fileName: string;
  isOutgoing?: boolean;
  onLoad: () => void;
  className?: string;
}) {
  const Icon = getMediaHydratingIcon(kind);

  return (
    <div
      className={cn(
        "flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-2 rounded-lg px-4 py-5 text-center",
        isOutgoing ? getChatMediaShellClassName(true) : getChatMediaShellClassName(false),
        className,
      )}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          isOutgoing ? getChatMediaPanelClassName(true) : getChatMediaPanelClassName(false),
        )}
      >
        <Icon className="size-5 opacity-80" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium">{fileName || "Attachment"}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={isOutgoing ? "secondary" : "outline"}
        className="h-8 gap-1.5"
        onClick={onLoad}
      >
        <DownloadIcon className="size-3.5" aria-hidden />
        {CHAT_MESSAGES.loadMediaAttachment}
      </Button>
    </div>
  );
}

function getMediaHydratingLabel(kind: ChatMediaKind): string {
  if (kind === "image") {
    return CHAT_MESSAGES.mediaHydratingPhoto;
  }

  if (kind === "audio") {
    return CHAT_MESSAGES.mediaHydratingVoice;
  }

  if (kind === "video") {
    return CHAT_MESSAGES.mediaHydratingVideo;
  }

  return CHAT_MESSAGES.mediaHydratingFile;
}

function getMediaHydratingIcon(kind: ChatMediaKind) {
  if (kind === "image") {
    return ImageIcon;
  }

  if (kind === "audio") {
    return MicIcon;
  }

  if (kind === "video") {
    return VideoIcon;
  }

  return FileIcon;
}

function MediaHydratingPlaceholder({
  kind,
  isOutgoing,
  className,
}: {
  kind: ChatMediaKind;
  isOutgoing?: boolean;
  className?: string;
}) {
  const Icon = getMediaHydratingIcon(kind);
  const label = getMediaHydratingLabel(kind);

  return (
    <div
      className={cn(
        "flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-2 rounded-lg px-4 py-5 text-center",
        isOutgoing ? getChatMediaShellClassName(true) : getChatMediaShellClassName(false),
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          isOutgoing ? getChatMediaPanelClassName(true) : getChatMediaPanelClassName(false),
        )}
      >
        <Icon className="size-5 opacity-80" aria-hidden />
      </div>
      <div className="flex items-center gap-2 text-xs font-medium">
        <Loader2Icon className="size-3.5 shrink-0 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  );
}

function MediaFailedPlaceholder({
  kind,
  fileName,
  isOutgoing,
  isRetrying,
  onRetry,
  className,
}: {
  kind: ChatMediaKind;
  fileName: string;
  isOutgoing?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  const Icon = getMediaHydratingIcon(kind);

  return (
    <div
      className={cn(
        "flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center",
        isOutgoing
          ? cn(getChatMediaCardClassName(true), "text-[#243028] dark:text-[#e8f0ee]")
          : cn(getChatMediaCardClassName(false), "text-[#5f6f78] dark:text-[#8b9aa6]"),
        className,
      )}
      role="alert"
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          isOutgoing ? getChatMediaPanelClassName(true) : getChatMediaPanelClassName(false),
        )}
      >
        <Icon className="size-5 opacity-80" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium">{fileName || "Attachment"}</p>
        <p className="text-xs opacity-80">{CHAT_MESSAGES.mediaHydrationFailed}</p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          size="sm"
          variant={isOutgoing ? "secondary" : "outline"}
          className="h-8 gap-1.5"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCwIcon className="size-3.5" aria-hidden />
          )}
          {isRetrying
            ? CHAT_MESSAGES.mediaRetryingHydration
            : CHAT_MESSAGES.mediaRetryHydration}
        </Button>
      ) : null}
    </div>
  );
}

function MediaLoadingPlaceholder({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] min-w-[180px] flex-col items-center justify-center gap-2 rounded-lg bg-black/5 px-3 py-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label ?? CHAT_MESSAGES.mediaHydratingFile}
    >
      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      {label ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
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
          ? getChatMediaDownloadButtonClassName(true)
          : getChatMediaDownloadButtonClassName(false),
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
  caption,
  isOutgoing,
  showDownloadButton = true,
  previewUrl,
  fullUrl,
  isPreviewLoading,
  isFullLoading,
  previewError,
  fullError,
  isHydrating = false,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  showDownloadButton?: boolean;
  previewUrl: string | null;
  fullUrl: string | null;
  isPreviewLoading: boolean;
  isFullLoading: boolean;
  previewError: boolean;
  fullError: boolean;
  isHydrating?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const hasThumb = Boolean(media.thumbPath);
  const displayUrl =
    previewUrl ?? fullUrl ?? (media.url?.startsWith("blob:") ? media.url : null);
  const resolvedFullUrl =
    fullUrl ?? (media.url?.startsWith("blob:") ? media.url : null);
  const isLoading = hasThumb ? isPreviewLoading : isFullLoading || isPreviewLoading;
  const hasError = hasThumb
    ? previewError && !displayUrl
    : (fullError || previewError) && !displayUrl;
  const showProgressiveFull =
    hasThumb &&
    Boolean(resolvedFullUrl) &&
    resolvedFullUrl !== displayUrl;

  if (isHydrating) {
    return (
      <div className="space-y-1">
        <MediaHydratingPlaceholder
          kind="image"
          isOutgoing={isOutgoing}
          className="max-w-[min(280px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (isLoading && !displayUrl) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder
          className="max-w-[min(280px,100%)]"
          label={CHAT_MESSAGES.mediaHydratingPhoto}
        />
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
          onClick={() => setLightboxOpen(true)}
          className="block w-full overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          aria-label={CHAT_MESSAGES.openMediaPreview}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={media.fileName}
            loading="lazy"
            decoding="async"
            className={cn(
              "max-h-72 w-full object-contain bg-black/5 transition-opacity duration-300 group-hover:opacity-95",
              isLoading && "opacity-80",
              showProgressiveFull && !fullImageLoaded && "opacity-95",
            )}
          />
          {showProgressiveFull ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolvedFullUrl ?? undefined}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              onLoad={() => setFullImageLoaded(true)}
              className={cn(
                "absolute inset-0 max-h-72 w-full object-contain bg-black/5 transition-opacity duration-300",
                fullImageLoaded ? "opacity-100" : "opacity-0",
              )}
            />
          ) : null}
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <Loader2Icon className="size-5 animate-spin text-white" />
            </div>
          ) : null}
        </button>
        {!isLoading && showDownloadButton ? (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <MediaDownloadButton
              url={resolvedFullUrl ?? displayUrl}
              fileName={media.fileName}
              isOutgoing={isOutgoing}
              className="bg-black/55 text-white hover:bg-black/70"
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
            {showDownloadButton ? (
              <MediaDownloadButton
                url={resolvedFullUrl ?? displayUrl}
                fileName={media.fileName}
                className="bg-white/10 text-white hover:bg-white/20"
              />
            ) : null}
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
  showDownloadButton = true,
  resolvedUrl,
  isLoading,
  hasError,
  isHydrating = false,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  showDownloadButton?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  isHydrating?: boolean;
}) {
  if (isHydrating) {
    return (
      <div className="space-y-1">
        <MediaHydratingPlaceholder
          kind="video"
          isOutgoing={isOutgoing}
          className="max-w-[min(300px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder
          className="max-w-[min(300px,100%)]"
          label={CHAT_MESSAGES.mediaHydratingVideo}
        />
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
          {showDownloadButton && resolvedUrl && !hasError && !isLoading ? (
            <MediaDownloadButton
              url={resolvedUrl}
              fileName={media.fileName}
              isOutgoing={isOutgoing}
              className="bg-black/55 text-white hover:bg-black/70"
            />
          ) : null}
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
  isHydrating = false,
}: {
  media: ChatMediaPayload;
  messageId?: string;
  caption?: string;
  isOutgoing?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  isHydrating?: boolean;
}) {
  const playbackUrl =
    resolvedUrl ??
    (media.url?.startsWith("blob:") ? media.url : null);

  if (isHydrating) {
    return (
      <div className="space-y-1">
        <MediaHydratingPlaceholder
          kind="audio"
          isOutgoing={isOutgoing}
          className="min-h-[72px] max-w-[min(300px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

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
  showDownloadButton = true,
  resolvedUrl,
  isLoading,
  hasError,
  isHydrating = false,
}: {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
  showDownloadButton?: boolean;
  resolvedUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  isHydrating?: boolean;
}) {
  const DocIcon = getDocumentIcon(media.mimeType);
  const sizeLabel = formatMediaFileSize(media.sizeBytes);

  if (isHydrating) {
    return (
      <div className="space-y-1">
        <MediaHydratingPlaceholder
          kind="document"
          isOutgoing={isOutgoing}
          className="min-h-[88px] max-w-[min(300px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex min-w-[220px] max-w-[min(300px,100%)] items-center gap-3 rounded-lg border px-3 py-2.5",
          isOutgoing ? getChatMediaCardClassName(true) : getChatMediaCardClassName(false),
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isOutgoing ? getChatMediaPanelClassName(true) : getChatMediaPanelClassName(false),
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
        ) : showDownloadButton && resolvedUrl && !hasError ? (
          <MediaDownloadButton
            url={resolvedUrl}
            fileName={media.fileName}
            isOutgoing={isOutgoing}
          />
        ) : !isLoading && !showDownloadButton ? null : (
          <PlayIcon className="size-4 shrink-0 opacity-30" />
        )}
      </div>
      <CaptionText caption={caption} isOutgoing={isOutgoing} />
    </div>
  );
}

export const ChatMediaMessage = memo(function ChatMediaMessage({
  media,
  messageId,
  caption,
  isOutgoing = false,
  showDownloadButton = true,
  isHydrating: isHydratingProp,
  isFailed: isFailedProp,
  onRetryStateChange,
}: ChatMediaMessageProps) {
  const [isRetrying, startRetryTransition] = useTransition();
  const [loadRequested, setLoadRequested] = useState(() =>
    shouldAutoLoadMedia(media, messageId) || isOutgoing,
  );
  const [persistedChecked, setPersistedChecked] = useState(
    () => shouldAutoLoadMedia(media, messageId) || isOutgoing,
  );
  const isHydrating =
    isHydratingProp ?? isMediaPendingHydration(media);
  const isFailed = isFailedProp ?? false;
  const showFailed = isFailed && !isHydrating;
  const shouldFetchMedia = loadRequested && !isHydrating && !showFailed;
  const hasThumb = Boolean(media.thumbPath && media.kind === "image");

  useEffect(() => {
    if (loadRequested || isOutgoing || isHydrating) {
      setPersistedChecked(true);
      return;
    }

    let cancelled = false;
    const keys = getMediaCacheKeys(media, messageId);

    void (async () => {
      for (const key of keys) {
        if (cancelled) {
          return;
        }

        if (await hasPersistedMediaBlob(key)) {
          if (!cancelled) {
            setLoadRequested(true);
          }
          break;
        }
      }

      if (!cancelled) {
        setPersistedChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrating, isOutgoing, loadRequested, media, messageId]);
  const imageUrls = useChatImageMediaUrls(media, {
    messageId,
    enabled: shouldFetchMedia && media.kind === "image",
    isHydrating,
  });
  const {
    url: resolvedUrl,
    isLoading: isFullLoading,
    error: fullError,
  } = useChatMediaUrl(media, {
    messageId,
    enabled: shouldFetchMedia && !hasThumb && media.kind !== "image",
  });

  const handleRetry = () => {
    if (!messageId || isRetrying) {
      return;
    }

    onRetryStateChange?.({
      attachmentPending: true,
      attachmentFailed: false,
    });

    startRetryTransition(async () => {
      const result = await retryInboundMediaAttachmentAction({ messageId });

      if (!result.success) {
        onRetryStateChange?.({
          attachmentPending: false,
          attachmentFailed: true,
        });
      }
    });
  };

  if (showFailed) {
    return (
      <div className="space-y-1">
        <MediaFailedPlaceholder
          kind={media.kind}
          fileName={media.fileName}
          isOutgoing={isOutgoing}
          isRetrying={isRetrying}
          onRetry={messageId ? handleRetry : undefined}
          className="max-w-[min(300px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  const needsLoadPrompt =
    persistedChecked &&
    !isOutgoing &&
    !isHydrating &&
    media.kind !== "audio" &&
    !loadRequested &&
    !media.url?.startsWith("blob:");

  if (!persistedChecked && !loadRequested && !isOutgoing && !isHydrating) {
    return (
      <div className="space-y-1">
        <MediaLoadingPlaceholder className="max-w-[min(300px,100%)]" />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  if (needsLoadPrompt) {
    return (
      <div className="space-y-1">
        <MediaLoadPrompt
          kind={media.kind}
          fileName={media.fileName}
          isOutgoing={isOutgoing}
          onLoad={() => setLoadRequested(true)}
          className="max-w-[min(300px,100%)]"
        />
        <CaptionText caption={caption} isOutgoing={isOutgoing} />
      </div>
    );
  }

  const showLoading =
    isHydrating ||
    (media.kind === "image"
      ? imageUrls.isPreviewLoading || imageUrls.isFullLoading
      : isFullLoading);

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
        caption={caption}
        isOutgoing={isOutgoing}
        showDownloadButton={showDownloadButton}
        previewUrl={hasThumb ? imageUrls.previewUrl : imageUrls.fullUrl}
        fullUrl={imageUrls.fullUrl}
        isPreviewLoading={showLoading}
        isFullLoading={imageUrls.isFullLoading}
        previewError={hasThumb ? imageUrls.previewError : imageUrls.fullError}
        fullError={imageUrls.fullError}
        isHydrating={isHydrating}
      />
    );
  }

  const shared = {
    media,
    caption,
    isOutgoing,
    showDownloadButton,
    resolvedUrl,
    previewUrl: resolvedUrl,
    isLoading: showLoading,
    hasError: fullError && !isHydrating,
    isHydrating,
  };

  if (media.kind === "video") {
    return <ChatMediaVideo {...shared} />;
  }

  if (media.kind === "audio") {
    return <ChatMediaAudio {...shared} messageId={messageId} />;
  }

  return <ChatMediaDocument {...shared} />;
});
