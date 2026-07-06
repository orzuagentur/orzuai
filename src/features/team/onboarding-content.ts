import type { TeamPermissionKey, TeamRole } from "@/features/team/types";
import { TEAM_PERMISSION_LABELS } from "@/features/team/permissions";
import { TEAM_ROLE_DESCRIPTIONS } from "@/features/team/constants";

export type TeamOnboardingStep = {
  title: string;
  description: string;
};

export type TeamRoleOnboardingContent = {
  headline: string;
  summary: string;
  capabilities: string[];
  steps: TeamOnboardingStep[];
  primaryCta: string;
  primaryHref: string;
};

export const TEAM_ROLE_ONBOARDING: Record<
  Exclude<TeamRole, "owner">,
  TeamRoleOnboardingContent
> = {
  admin: {
    headline: "Welcome — you're an Admin",
    summary:
      "You can manage the inbox, CRM, AI agent, integrations, and team members for this workspace.",
    capabilities: [
      "Reply to customers across all connected channels",
      "Manage contacts, deals, and pipeline stages",
      "Configure AI assistant behavior and knowledge",
      "Invite and manage team members (except billing)",
    ],
    steps: [
      {
        title: "Open the unified inbox",
        description:
          "Start in Inbox to see live conversations. Use filters and assignments to stay on top of volume.",
      },
      {
        title: "Review CRM records",
        description:
          "Contacts and deals give every conversation context. Update stages as opportunities progress.",
      },
      {
        title: "Tune the AI agent",
        description:
          "Visit AI Agent to adjust tone, handoff rules, and knowledge sources before enabling auto-replies.",
      },
      {
        title: "Manage the team",
        description:
          "Use Team to invite agents, set roles, and control who can access each area.",
      },
    ],
    primaryCta: "Open inbox",
    primaryHref: "/dashboard/chats",
  },
  manager: {
    headline: "Welcome — you're a Manager",
    summary:
      "You oversee customer conversations, CRM, calendar, and analytics for this business.",
    capabilities: [
      "Monitor and reply in the shared inbox",
      "Manage contacts and deals in CRM",
      "View calendar bookings and availability",
      "Track team performance in Analytics",
    ],
    steps: [
      {
        title: "Check the inbox first",
        description:
          "Inbox is your command center. Prioritize unanswered threads and assign work to agents.",
      },
      {
        title: "Keep CRM up to date",
        description:
          "Log notes, update deal stages, and link conversations to the right contact records.",
      },
      {
        title: "Review the calendar",
        description:
          "See upcoming bookings and confirm availability with customers when needed.",
      },
      {
        title: "Use analytics weekly",
        description:
          "Analytics shows response times, channel volume, and AI-assisted outcomes.",
      },
    ],
    primaryCta: "Go to inbox",
    primaryHref: "/dashboard/chats",
  },
  agent: {
    headline: "Welcome — you're an Agent",
    summary:
      "You handle customer conversations and keep CRM records accurate for your assigned work.",
    capabilities: [
      "Reply to customers in the shared inbox",
      "View and update contact profiles",
      "Use quick replies and AI suggestions",
      "Manage your calendar appointments",
    ],
    steps: [
      {
        title: "Start with Inbox",
        description:
          "Open assigned conversations, read AI summaries, and reply with your brand voice.",
      },
      {
        title: "Update contact details",
        description:
          "After each interaction, confirm names, tags, and deal stage in CRM.",
      },
      {
        title: "Use quick replies",
        description:
          "Saved quick replies in Settings help you respond faster to common questions.",
      },
      {
        title: "Hand off when needed",
        description:
          "Escalate to a manager or disable AI when a customer needs a human decision.",
      },
    ],
    primaryCta: "Open inbox",
    primaryHref: "/dashboard/chats",
  },
  viewer: {
    headline: "Welcome — you're a Viewer",
    summary:
      "You have read-only access to monitor conversations, CRM, and analytics.",
    capabilities: [
      "Read conversations across connected channels",
      "View contacts and deal pipeline",
      "Access analytics dashboards",
      "No sending messages or changing settings",
    ],
    steps: [
      {
        title: "Browse the inbox",
        description:
          "Follow live conversations to understand customer needs and team performance.",
      },
      {
        title: "Explore CRM",
        description:
          "Review contact history and deal stages without making edits.",
      },
      {
        title: "Check analytics",
        description:
          "Use dashboards to track volume, response quality, and channel trends.",
      },
      {
        title: "Request access if needed",
        description:
          "Contact your workspace admin if you need permission to reply or edit records.",
      },
    ],
    primaryCta: "View analytics",
    primaryHref: "/dashboard/analytics",
  },
};

export function getEnabledPermissionLabels(
  permissions: Record<TeamPermissionKey, boolean>,
): string[] {
  return (Object.entries(permissions) as Array<[TeamPermissionKey, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([key]) => TEAM_PERMISSION_LABELS[key].label);
}

export function getRoleDescription(role: TeamRole): string {
  return TEAM_ROLE_DESCRIPTIONS[role as keyof typeof TEAM_ROLE_DESCRIPTIONS] ?? "";
}
