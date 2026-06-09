"use client";

import { FileIcon, MicIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMediaPayload } from "@/utils/chat-media";

type ChatMediaMessageProps = {
  media: ChatMediaPayload;
  caption?: string;
  isOutgoing?: boolean;
};

export function ChatMediaMessage({
  media,
  caption,
  isOutgoing = false,
}: ChatMediaMessageProps) {
  if (media.kind === "image" && media.url) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.fileName}
          className="max-h-64 w-full rounded-md object-cover"
        />
        {caption ? <p className="whitespace-pre-wrap break-words">{caption}</p> : null}
      </div>
    );
  }

  if (media.kind === "audio" && media.url) {
    return (
      <div className="space-y-2">
        <audio controls preload="metadata" className="w-full max-w-xs">
          <source src={media.url} type={media.mimeType} />
        </audio>
        {caption ? <p className="whitespace-pre-wrap break-words">{caption}</p> : null}
      </div>
    );
  }

  if (media.kind === "video" && media.url) {
    return (
      <div className="space-y-2">
        <video controls preload="metadata" className="max-h-64 w-full rounded-md">
          <source src={media.url} type={media.mimeType} />
        </video>
        {caption ? <p className="whitespace-pre-wrap break-words">{caption}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <a
        href={media.url || undefined}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm underline-offset-2 hover:underline",
          isOutgoing ? "border-emerald-400/40" : "border-border",
        )}
      >
        {media.kind === "audio" ? (
          <MicIcon className="size-4 shrink-0" />
        ) : (
          <FileIcon className="size-4 shrink-0" />
        )}
        <span className="truncate">{media.fileName}</span>
      </a>
      {caption ? <p className="whitespace-pre-wrap break-words">{caption}</p> : null}
    </div>
  );
}
