"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2Icon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareIcon,
  PhoneIcon,
  TargetIcon,
  UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ContactProfileInfoRow = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  href?: string;
};

type ContactProfileInfoTableProps = {
  rows: ContactProfileInfoRow[];
  className?: string;
};

export function ContactProfileInfoTable({
  rows,
  className,
}: ContactProfileInfoTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {rows.map((row, index) => {
            const Icon = row.icon;

            return (
              <tr key={`${row.label}-${index}`} className="align-top">
                <td className="w-36 shrink-0 px-3 py-2.5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0" />
                    <span className="text-xs font-medium">{row.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-medium [overflow-wrap:anywhere] [word-break:break-word]">
                  {row.href && typeof row.value === "string" ? (
                    <a
                      href={row.href}
                      className="text-primary hover:underline"
                    >
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const CONTACT_PROFILE_INFO_ICONS = {
  phone: PhoneIcon,
  email: MailIcon,
  company: Building2Icon,
  location: MapPinIcon,
  created: CalendarIcon,
  lastContact: ClockIcon,
  messages: MessageSquareIcon,
  assigned: UserIcon,
  pipeline: TargetIcon,
  dealValue: DollarSignIcon,
  closeDate: CalendarIcon,
} as const;
