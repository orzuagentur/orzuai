"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  MessageSquareQuoteIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  SmileIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";

import { toast } from "sonner";

import {
  ComposerAttachmentPreview,
  ComposerRecordingBar,
  type ComposerAttachmentKind,
} from "@/components/chats/inbox/ComposerAttachmentPreview";
import { ConversationInternalNotes } from "@/components/chats/ConversationInternalNotes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import { CHAT_ATTACHMENT_ACCEPT } from "@/features/chats/chat-attachments";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  chatComposerFieldClassName,
  chatComposerShellClassName,
  chatSendButtonClassName,
} from "@/features/chats/chat-theme";
import { cn } from "@/lib/utils";
import type { MediaUploadProgress } from "@/hooks/use-send-chat-media";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingChannel } from "@/types/database.types";

const QUICK_EMOJIS = [
  "😀", "😊", "😂", "❤️", "👍", "🙏", "🎉", "✅", "🔥", "👋",
  "😉", "🤝", "💯", "⭐", "📎",
];

const TEXTAREA_MAX_HEIGHT_PX = 160;

type PendingAttachment = {
  file: File;
  previewUrl: string | null;
  kind: ComposerAttachmentKind;
  durationMs?: number;
};

type InboxChatComposerProps = {
  conversationId: string;
  channel: MessagingChannel;
  internalNote: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  cannedResponses: CannedResponseItem[];
  canSend: boolean;
  channelNotConnectedMessage: string;
  websiteFormsHint?: boolean;
  isSending: boolean;
  isSendingMedia?: boolean;
  mediaUploadProgress?: MediaUploadProgress | null;
  composerTab: "reply" | "note";
  onComposerTabChange: (tab: "reply" | "note") => void;
  onSubmit: () => void;
  onOpenAiSuggest: () => void;
  onQuickRepliesOpen?: () => void;
  onSendMedia?: (file: File, caption?: string) => Promise<boolean> | boolean;
};

function supportsMediaChannel(channel: MessagingChannel): boolean {
  return (
    channel === "whatsapp" ||
    channel === "telegram" ||
    channel === "instagram" ||
    channel === "website_forms"
  );
}

function detectAttachmentKind(file: File): ComposerAttachmentKind {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "document";
}

function createPreviewUrl(file: File, kind: ComposerAttachmentKind): string | null {
  if (kind === "image" || kind === "video" || kind === "audio") {
    return URL.createObjectURL(file);
  }

  return null;
}

export function InboxChatComposer({
  conversationId,
  channel,
  internalNote,
  draft,
  onDraftChange,
  cannedResponses,
  canSend,
  channelNotConnectedMessage,
  websiteFormsHint = false,
  isSending,
  isSendingMedia = false,
  mediaUploadProgress = null,
  composerTab,
  onComposerTabChange,
  onSubmit,
  onOpenAiSuggest,
  onQuickRepliesOpen,
  onSendMedia,
}: InboxChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const mediaSupported = supportsMediaChannel(channel);
  const isBusy = isSending;
  const hasPendingAttachment = pendingAttachment !== null;

  const clearPendingAttachment = useCallback(() => {
    setMediaCaption("");
    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  }, []);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [draft, resizeTextarea]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }

      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment?.previewUrl]);

  function insertEmoji(emoji: string) {
    onDraftChange(draft + emoji);
  }

  function handleAttachClick() {
    if (!mediaSupported) {
      toast.info(CHAT_MESSAGES.mediaNotSupportedForChannel);
      return;
    }

    fileInputRef.current?.click();
  }

  function stageAttachment(file: File, durationMs?: number) {
    const kind = detectAttachmentKind(file);
    const previewUrl = createPreviewUrl(file, kind);

    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl,
        kind,
        durationMs,
      };
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!mediaSupported || !onSendMedia) {
      toast.info(CHAT_MESSAGES.mediaNotSupportedForChannel);
      return;
    }

    stageAttachment(file);
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startVoiceRecording() {
    if (!mediaSupported || !onSendMedia) {
      toast.info(CHAT_MESSAGES.mediaNotSupportedForChannel);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(CHAT_MESSAGES.voiceNotSupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ??
        "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        clearRecordingTimer();

        const blob = new Blob(mediaChunksRef.current, { type: mimeType });

        if (!blob.size) {
          setIsRecording(false);
          setRecordingElapsed(0);
          recordingStartedAtRef.current = null;
          return;
        }

        const extension = mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
            ? "m4a"
            : "webm";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: mimeType,
        });
        const durationMs = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : undefined;

        stageAttachment(file, durationMs);
        setIsRecording(false);
        setRecordingElapsed(0);
        recordingStartedAtRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsed(0);
      recordingTimerRef.current = window.setInterval(() => {
        if (recordingStartedAtRef.current) {
          setRecordingElapsed(
            Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
          );
        }
      }, 250);
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error(CHAT_MESSAGES.voiceNotSupported);
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      clearRecordingTimer();
      return;
    }

    recorder.stop();
    mediaRecorderRef.current = null;
  }

  function handleVoiceClick() {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    if (hasPendingAttachment) {
      return;
    }

    void startVoiceRecording();
  }

  function handleSendPendingAttachment() {
    if (!pendingAttachment || !onSendMedia) {
      return;
    }

    const file = pendingAttachment.file;
    const caption = mediaCaption.trim() || undefined;

    clearPendingAttachment();
    void onSendMedia(file, caption);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSend && draft.trim() && !isBusy && !hasPendingAttachment) {
        onSubmit();
      }
    }
  }

  return (
    <div
      className={cn("mt-auto shrink-0", chatComposerShellClassName)}
      data-inbox-chat-composer
    >
      <div className="flex gap-1 border-b px-3 pt-2">
        <Button
          type="button"
          size="sm"
          variant={composerTab === "reply" ? "secondary" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onComposerTabChange("reply")}
        >
          {CHAT_MESSAGES.composerReplyTab}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={composerTab === "note" ? "secondary" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onComposerTabChange("note")}
        >
          {CHAT_MESSAGES.composerNoteTab}
        </Button>
      </div>

      {composerTab === "note" ? (
        <div className="p-3">
          <ConversationInternalNotes
            conversationId={conversationId}
            initialNote={internalNote}
            layout="compact"
          />
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {!canSend ? (
            <p className="text-xs text-muted-foreground">{channelNotConnectedMessage}</p>
          ) : websiteFormsHint ? (
            <p className="text-xs text-muted-foreground">
              {CHAT_MESSAGES.websiteFormsReplyHint}
            </p>
          ) : null}

          {isRecording ? (
            <ComposerRecordingBar
              elapsedSeconds={recordingElapsed}
              onStop={stopVoiceRecording}
            />
          ) : null}

          {pendingAttachment ? (
            <ComposerAttachmentPreview
              file={pendingAttachment.file}
              previewUrl={pendingAttachment.previewUrl}
              kind={pendingAttachment.kind}
              durationMs={pendingAttachment.durationMs}
              caption={mediaCaption}
              onCaptionChange={setMediaCaption}
              isSending={isSendingMedia}
              uploadProgress={mediaUploadProgress?.percent}
              uploadSpeedBps={mediaUploadProgress?.bytesPerSecond}
              uploadPhase={mediaUploadProgress?.phase}
              onCancel={clearPendingAttachment}
              onSend={() => {
                void handleSendPendingAttachment();
              }}
            />
          ) : null}

          <div className="flex items-end gap-2">
            <div className="flex shrink-0 items-center gap-0.5 pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled={!canSend || isBusy || isRecording || hasPendingAttachment}
                    aria-label={CHAT_MESSAGES.emojiPickerLabel}
                  >
                    <SmileIcon className="size-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>{CHAT_MESSAGES.emojiPickerLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex size-9 items-center justify-center rounded-md text-lg hover:bg-muted"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                disabled={!canSend || isBusy || isRecording || hasPendingAttachment}
                aria-label={CHAT_MESSAGES.attachFileLabel}
                onClick={handleAttachClick}
              >
                <PaperclipIcon className="size-5 text-muted-foreground" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={CHAT_ATTACHMENT_ACCEPT}
                onChange={handleFileChange}
              />

              <Button
                type="button"
                variant={isRecording ? "destructive" : "ghost"}
                size="icon"
                className="size-9 rounded-full"
                disabled={!canSend || isBusy || hasPendingAttachment}
                aria-label={CHAT_MESSAGES.voiceMessageLabel}
                onClick={handleVoiceClick}
              >
                {isRecording ? (
                  <SquareIcon className="size-5" />
                ) : (
                  <MicIcon className="size-5 text-muted-foreground" />
                )}
              </Button>

              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) {
                    onQuickRepliesOpen?.();
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled={!canSend || isBusy || isRecording || hasPendingAttachment}
                    aria-label={CANNED_RESPONSES_MESSAGES.pickerLabel}
                  >
                    <MessageSquareQuoteIcon className="size-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel>
                    {CANNED_RESPONSES_MESSAGES.pickerLabel}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {cannedResponses.length === 0 ? (
                    <>
                      <p className="px-2 py-2 text-xs text-muted-foreground">
                        {CANNED_RESPONSES_MESSAGES.pickerEmpty}
                      </p>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href={DASHBOARD_ROUTES.settings}
                          className="gap-2 font-medium"
                        >
                          <PlusIcon className="size-4" />
                          {CANNED_RESPONSES_MESSAGES.addButton}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    cannedResponses.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        className="flex flex-col items-start gap-0.5"
                        onClick={() => onDraftChange(item.content)}
                      >
                        <span className="font-medium">{item.title}</span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {item.content}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                disabled={!canSend || isBusy || isRecording || hasPendingAttachment}
                aria-label={CHAT_MESSAGES.suggestReplyButton}
                onClick={onOpenAiSuggest}
              >
                <SparklesIcon className="size-5 text-muted-foreground" />
              </Button>
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 items-end gap-2 px-3 py-2",
                chatComposerFieldClassName,
              )}
            >
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={CHAT_MESSAGES.composerPlaceholder}
                rows={1}
                disabled={isBusy || !canSend || isRecording}
                className={cn(
                  "min-h-[24px] flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 shadow-none outline-none",
                  "focus-visible:border-0 focus-visible:ring-0",
                  "dark:bg-transparent dark:disabled:bg-transparent",
                )}
                style={{ maxHeight: TEXTAREA_MAX_HEIGHT_PX }}
              />
              <Button
                type="button"
                size="icon"
                className={cn("size-10 shrink-0 rounded-full", chatSendButtonClassName)}
                disabled={
                  isBusy || !canSend || !draft.trim() || isRecording || hasPendingAttachment
                }
                aria-label={CHAT_MESSAGES.sendLabel}
                onClick={onSubmit}
              >
                {isBusy ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
