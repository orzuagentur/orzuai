export type EmailTemplateCategory =
  | "auth"
  | "onboarding"
  | "transactional"
  | "booking"
  | "team"
  | "system"
  | "admin";

export type EmailTemplateDefinition = {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  defaultSubject: string;
};

export const EMAIL_TEMPLATE_REGISTRY: EmailTemplateDefinition[] = [
  {
    id: "verification",
    name: "Email verification",
    category: "auth",
    description: "Sent when a user registers with email.",
    defaultSubject: "Confirm your OrzuX email",
  },
  {
    id: "magic_link",
    name: "Magic link sign-in",
    category: "auth",
    description: "Passwordless sign-in link.",
    defaultSubject: "Sign in to OrzuX",
  },
  {
    id: "password_reset",
    name: "Password reset",
    category: "auth",
    description: "Password recovery link.",
    defaultSubject: "Reset your OrzuX password",
  },
  {
    id: "google_welcome",
    name: "Google welcome",
    category: "onboarding",
    description: "Welcome email after Google sign-up.",
    defaultSubject: "Welcome to OrzuX — glad you're here",
  },
  {
    id: "onboarding_drip",
    name: "Onboarding drip",
    category: "onboarding",
    description: "Automated setup tips on days 0, 1, 2, 3, 5, and 7.",
    defaultSubject: "OrzuX setup guide",
  },
  {
    id: "team_invite",
    name: "Team invitation",
    category: "team",
    description: "Invite a teammate to a business workspace.",
    defaultSubject: "You've been invited to join a team on OrzuX",
  },
  {
    id: "booking_confirmation",
    name: "Booking confirmation",
    category: "booking",
    description: "Customer booking confirmed.",
    defaultSubject: "Booking confirmed",
  },
  {
    id: "booking_action",
    name: "Booking update",
    category: "booking",
    description: "Booking updated or cancelled.",
    defaultSubject: "Booking update",
  },
  {
    id: "lead_follow_up",
    name: "Lead follow-up",
    category: "transactional",
    description: "Auto-reply after website form submission.",
    defaultSubject: "Thank you for contacting us",
  },
  {
    id: "system_notification",
    name: "System notification",
    category: "system",
    description: "Platform system messages.",
    defaultSubject: "Notification from OrzuX",
  },
  {
    id: "admin_invite",
    name: "Admin invite",
    category: "admin",
    description: "Platform admin panel invitation.",
    defaultSubject: "OrzuX Admin access",
  },
  {
    id: "platform_broadcast",
    name: "Platform broadcast",
    category: "system",
    description: "Global email to all platform users from OrzuX.",
    defaultSubject: "Message from OrzuX",
  },
];

export function getEmailTemplateDefinition(
  templateId: string,
): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATE_REGISTRY.find((entry) => entry.id === templateId);
}
