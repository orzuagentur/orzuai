"use client";

import Link from "next/link";
import { MessageSquareQuoteIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { CannedResponseItem } from "@/types/canned-response.types";

type QuickRepliesPickerProps = {
  responses: CannedResponseItem[];
  disabled?: boolean;
  onSelect: (content: string) => void;
};

export function QuickRepliesPicker({
  responses,
  disabled = false,
  onSelect,
}: QuickRepliesPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
        >
          <MessageSquareQuoteIcon className="size-3.5" />
          {CANNED_RESPONSES_MESSAGES.pickerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{CANNED_RESPONSES_MESSAGES.pickerLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {responses.length === 0 ? (
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
          responses.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5"
              onClick={() => onSelect(item.content)}
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
  );
}
