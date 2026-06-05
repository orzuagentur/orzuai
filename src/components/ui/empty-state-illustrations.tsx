import { cn } from "@/lib/utils";

type IllustrationProps = {
  className?: string;
};

export function InboxEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={cn("size-24 text-primary/40", className)}
      aria-hidden="true"
    >
      <rect
        x="12"
        y="20"
        width="96"
        height="64"
        rx="12"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="24"
        y="36"
        width="48"
        height="8"
        rx="4"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        x="24"
        y="52"
        width="72"
        height="8"
        rx="4"
        fill="currentColor"
        opacity="0.25"
      />
      <circle cx="88" cy="40" r="10" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function ContactsEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={cn("size-24 text-primary/40", className)}
      aria-hidden="true"
    >
      <circle cx="44" cy="36" r="16" fill="currentColor" opacity="0.2" />
      <circle cx="76" cy="40" r="12" fill="currentColor" opacity="0.15" />
      <path
        d="M20 76c4-14 16-22 28-22s24 8 28 22"
        fill="currentColor"
        opacity="0.25"
      />
      <path
        d="M56 72c3-10 12-16 20-16s17 6 20 16"
        fill="currentColor"
        opacity="0.18"
      />
    </svg>
  );
}

export function KnowledgeEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={cn("size-24 text-primary/40", className)}
      aria-hidden="true"
    >
      <path
        d="M28 24h48l16 16v40H28V24z"
        fill="currentColor"
        opacity="0.15"
      />
      <path d="M76 24v16h16" fill="currentColor" opacity="0.25" />
      <rect
        x="40"
        y="48"
        width="40"
        height="6"
        rx="3"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        x="40"
        y="60"
        width="32"
        height="6"
        rx="3"
        fill="currentColor"
        opacity="0.25"
      />
    </svg>
  );
}

export function SetupEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={cn("size-24 text-primary/40", className)}
      aria-hidden="true"
    >
      <circle cx="60" cy="48" r="28" fill="currentColor" opacity="0.12" />
      <path
        d="M60 30v36M42 48h36"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
