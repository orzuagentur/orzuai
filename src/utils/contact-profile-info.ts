"use client";

import { createElement } from "react";
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

import type { ContactProfileInfoRow } from "@/components/contacts/ContactProfileInfoTable";
import { RelativeTime } from "@/components/ui/relative-time";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { formatDealMoney } from "@/lib/deal-currency";
import type { ContactProfileData, PipelineStage } from "@/types/contact.types";
import type { AdditionalContactEntry } from "@/utils/contact-additional-contacts";
import { formatContactIdentifier } from "@/utils/contact-display";

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function additionalContactRows(
  entries: AdditionalContactEntry[],
): ContactProfileInfoRow[] {
  return entries.map((entry) => {
    const typeLabel =
      entry.type === "phone"
        ? CONTACTS_MESSAGES.additionalPhoneLabel
        : CONTACTS_MESSAGES.additionalEmailLabel;
    const label = entry.label
      ? `${typeLabel} (${entry.label})`
      : typeLabel;

    return {
      icon: entry.type === "phone" ? PhoneIcon : MailIcon,
      label,
      value: entry.value,
      href:
        entry.type === "email"
          ? `mailto:${entry.value}`
          : entry.type === "phone"
            ? `tel:${entry.value}`
            : undefined,
    };
  });
}

export function buildContactProfileInfoRows(
  profile: ContactProfileData,
): ContactProfileInfoRow[] {
  const { contact } = profile;
  const primaryDeal =
    profile.deals.find((deal) => deal.isPrimary) ?? profile.deals[0] ?? null;
  const additional =
    contact.customFields.additionalContacts ?? [];

  return [
    {
      icon: PhoneIcon,
      label: CONTACTS_MESSAGES.primaryPhoneLabel,
      value: formatContactIdentifier(contact.identifier),
      href: `tel:${contact.identifier}`,
    },
    {
      icon: MailIcon,
      label: CONTACTS_MESSAGES.emailLabel,
      value: contact.email ?? "—",
      href: contact.email ? `mailto:${contact.email}` : undefined,
    },
    ...additionalContactRows(additional),
    {
      icon: Building2Icon,
      label: CONTACTS_MESSAGES.companyLabel,
      value: contact.customFields.company ?? "—",
    },
    {
      icon: MapPinIcon,
      label: CONTACTS_MESSAGES.locationLabel,
      value: contact.customFields.location ?? "—",
    },
    {
      icon: CalendarIcon,
      label: CONTACTS_MESSAGES.createdAtLabel,
      value: formatShortDate(contact.createdAt),
    },
    {
      icon: ClockIcon,
      label: CONTACTS_MESSAGES.lastContactLabel,
      value: contact.lastMessageAt
        ? createElement(RelativeTime, { value: contact.lastMessageAt })
        : "—",
    },
    {
      icon: MessageSquareIcon,
      label: CONTACTS_MESSAGES.messageCountLabel,
      value: String(profile.messageCount),
    },
    {
      icon: UserIcon,
      label: CONTACTS_MESSAGES.assignedToLabel,
      value: profile.assignedToEmail ?? "—",
    },
    {
      icon: TargetIcon,
      label: CONTACTS_MESSAGES.pipelineStageLabel,
      value: PIPELINE_STAGE_LABELS[contact.pipelineStage],
    },
    {
      icon: DollarSignIcon,
      label: CONTACTS_MESSAGES.dealValueLabel,
      value: formatDealMoney(
        contact.dealValue,
        primaryDeal?.currency ?? "USD",
      ),
    },
    {
      icon: CalendarIcon,
      label: CONTACTS_MESSAGES.expectedCloseLabel,
      value: contact.expectedCloseDate ?? "—",
    },
  ];
}
