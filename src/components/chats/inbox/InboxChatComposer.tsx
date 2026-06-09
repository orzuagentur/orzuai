"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2Icon,
  MessageSquareQuoteIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import { CHAT_ATTACHMENT_ACCEPT } from "@/features/chats/chat-attachments";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingChannel } from "@/types/database.types";

const QUICK_EMOJIS = [
  "😀", "😊", "😂", "❤️", "👍", "🙏", "🎉", "✅", "🔥", "👋",
  "😉", "🤝", "💯", "⭐", "📎",
];

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
  composerTab: "reply" | "note";
  onComposerTabChange: (tab: "reply" | "note") => void;
  onSubmit: () => void;
  onOpenAiSuggest: () => void;
  onSendMedia?: (file: File) => void;
};

function supportsMediaChannel(channel: MessagingChannel): boolean {
  return channel === "whatsapp";
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
  composerTab,
  onComposerTabChange,
  onSubmit,
  onOpenAiSuggest,
  onSendMedia,
}: InboxChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaSupported = supportsMediaChannel(channel);
  const isBusy = isSending || isSendingMedia;

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

    onSendMedia(file);
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

        const blob = new Blob(mediaChunksRef.current, { type: mimeType });

        if (!blob.size) {
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

        onSendMedia(file);
      };

      mediaRecorderRef.current = recorder;
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
      return;
    }

    recorder.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  function handleVoiceClick() {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    void startVoiceRecording();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSend && draft.trim() && !isBusy) {
        onSubmit();
      }
    }
  }

  return (
    <div className="mt-auto shrink-0 border-t bg-muted/20">
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
            <p className="text-xs font-medium text-destructive">
              {CHAT_MESSAGES.voiceRecordingLabel}
            </p>
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
                    disabled={!canSend || isBusy}
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
                disabled={!canSend || isBusy}
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
                disabled={!canSend || isBusy}
                aria-label={CHAT_MESSAGES.voiceMessageLabel}
                onClick={handleVoiceClick}
              >
                {isRecording ? (
                  <SquareIcon className="size-5" />
                ) : (
                  <MicIcon className="size-5 text-muted-foreground" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    disabled={!canSend || isBusy}
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
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      {CANNED_RESPONSES_MESSAGES.pickerEmpty}
                    </p>
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
                disabled={!canSend || isBusy}
                aria-label={CHAT_MESSAGES.suggestReplyButton}
                onClick={onOpenAiSuggest}
              >
                <SparklesIcon className="size-5 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex min-w-0 flex-1 items-end gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm">
              <Textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={CHAT_MESSAGES.composerPlaceholder}
                rows={1}
                disabled={isBusy || !canSend}
                className={cn(
                  "max-h-32 min-h-[24px] flex-1 resize-none border-0 bg-transparent p-0 shadow-none",
                  "focus-visible:ring-0",
                )}
              />
              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isBusy || !canSend || !draft.trim()}
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
