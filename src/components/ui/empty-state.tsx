import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  ContactsEmptyIllustration,
  InboxEmptyIllustration,
  KnowledgeEmptyIllustration,
  SetupEmptyIllustration,
} from "@/components/ui/empty-state-illustrations";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "inbox" | "contacts" | "knowledge" | "setup" | "generic";

type EmptyStateProps = {
  variant?: EmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  illustration?: ReactNode;
};

const ILLUSTRATIONS: Record<EmptyStateVariant, ReactNode> = {
  inbox: <InboxEmptyIllustration />,
  contacts: <ContactsEmptyIllustration />,
  knowledge: <KnowledgeEmptyIllustration />,
  setup: <SetupEmptyIllustration />,
  generic: <InboxEmptyIllustration />,
};

export function EmptyState({
  variant = "generic",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  illustration,
}: EmptyStateProps) {
  const hasAction = Boolean(actionLabel && (actionHref || onAction));

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      {illustration ?? ILLUSTRATIONS[variant]}
      <div className="max-w-sm space-y-2">
        <h3 className="text-h3 text-foreground">{title}</h3>
        <p className="text-body text-muted-foreground">{description}</p>
      </div>
      {hasAction ? (
        actionHref ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  );
}
