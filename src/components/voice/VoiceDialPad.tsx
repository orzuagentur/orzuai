"use client";

import { useCallback, useEffect, useRef } from "react";
import { DeleteIcon, PhoneIcon, UserPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";

const DIAL_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
] as const;

const DIAL_INPUT_PATTERN = /^[\d+*#]*$/;

type VoiceDialPadProps = {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  onDigitPress?: (digit: string) => void;
  callDisabled?: boolean;
  onAddContact?: () => void;
  className?: string;
};

export function VoiceDialPad({
  value,
  onChange,
  onCall,
  onDigitPress,
  callDisabled = false,
  onAddContact,
  className,
}: VoiceDialPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const appendDigit = useCallback(
    (digit: string) => {
      onChange(`${value}${digit}`);
      onDigitPress?.(digit);
    },
    [onChange, onDigitPress, value],
  );

  const deleteDigit = useCallback(() => {
    onChange(value.slice(0, -1));
  }, [onChange, value]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingElsewhere =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable) &&
        target !== inputRef.current;

      if (isTypingElsewhere) {
        return;
      }

      if (/^[0-9*#]$/.test(event.key)) {
        event.preventDefault();
        appendDigit(event.key);
        return;
      }

      if (event.key === "+" && !value.includes("+")) {
        event.preventDefault();
        onChange(`+${value}`);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        deleteDigit();
        return;
      }

      if (event.key === "Enter" && value.trim() && !callDisabled) {
        event.preventDefault();
        onCall();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appendDigit, callDisabled, deleteDigit, onCall, onChange, value]);

  function handleInputChange(nextValue: string) {
    const sanitized = nextValue.replace(/[^\d+*#]/g, "");

    if (!DIAL_INPUT_PATTERN.test(sanitized)) {
      return;
    }

    onChange(sanitized);
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 px-4 py-3", className)}>
      <div className="w-full max-w-[280px]">
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder={VOICE_MESSAGES.dialpadTitle}
          className={cn(
            "w-full border-0 bg-transparent text-center text-2xl font-medium tracking-wide outline-none placeholder:text-muted-foreground/50",
            value ? "text-foreground" : "text-muted-foreground",
          )}
        />
      </div>

      <div className="grid w-full max-w-[280px] grid-cols-3 gap-2">
        {DIAL_KEYS.map((key) => (
          <button
            key={key.digit}
            type="button"
            onClick={() => appendDigit(key.digit)}
            className="flex h-14 flex-col items-center justify-center rounded-full bg-muted/50 text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <span className="text-xl font-medium leading-none">{key.digit}</span>
            {key.letters ? (
              <span className="mt-0.5 text-[10px] tracking-widest text-muted-foreground">
                {key.letters}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-[280px] items-center justify-center gap-6 pt-1">
        <button
          type="button"
          onClick={deleteDigit}
          disabled={!value}
          aria-label={VOICE_MESSAGES.dialpadDeleteDigit}
          className="flex size-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          <DeleteIcon className="size-5" />
        </button>

        <Button
          type="button"
          size="icon"
          disabled={callDisabled || !value.trim()}
          onClick={onCall}
          aria-label={VOICE_MESSAGES.callOutbound}
          className="size-14 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
        >
          <PhoneIcon className="size-6" />
        </Button>

        <div className="size-12" aria-hidden={!onAddContact}>
          {onAddContact ? (
            <button
              type="button"
              onClick={onAddContact}
              aria-label={VOICE_MESSAGES.addContactButton}
              className="flex size-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <UserPlusIcon className="size-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
