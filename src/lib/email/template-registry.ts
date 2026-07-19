export type EmailTemplateCategory =
  | "auth"
  | "onboarding"
  | "transactional"
  | "booking"
  | "team"
  | "system"
  | "admin"
  | "billing";

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
    id: "password_changed",
    name: "Password changed",
    category: "auth",
    description: "Sent when a user updates their account password.",
    defaultSubject: "Your OrzuX password was changed",
  },
  {
    id: "new_device_login",
    name: "New device sign-in",
    category: "auth",
    description: "Sent when a user signs in from a new browser or device.",
    defaultSubject: "New sign-in to your OrzuX account",
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
  {
    id: "subscription_purchased",
    name: "Subscription purchased",
    category: "billing",
    description: "Sent when a business subscribes to a paid plan.",
    defaultSubject: "Your OrzuX subscription is active",
  },
  {
    id: "subscription_renewed",
    name: "Subscription renewed",
    category: "billing",
    description: "Sent when a monthly subscription payment succeeds.",
    defaultSubject: "Your OrzuX subscription was renewed",
  },
  {
    id: "subscription_plan_changed",
    name: "Subscription plan changed",
    category: "billing",
    description: "Sent when a business upgrades or downgrades its plan.",
    defaultSubject: "Your OrzuX plan was updated",
  },
  {
    id: "trial_ended",
    name: "Trial ended",
    category: "billing",
    description: "Sent when the 3-day signup trial expires and a paid plan is required.",
    defaultSubject: "Your OrzuX 3-day trial has ended",
  },
  {
    id: "payment_card_failed",
    name: "Card payment failed",
    category: "billing",
    description: "Sent when a subscription card payment fails.",
    defaultSubject: "Action required: your OrzuX payment failed",
  },
  {
    id: "payment_bank_failed",
    name: "Bank debit payment failed",
    category: "billing",
    description: "Sent when a subscription bank debit payment fails.",
    defaultSubject: "Action required: your OrzuX bank payment failed",
  },
  {
    id: "card_expiring",
    name: "Card expiring soon",
    category: "billing",
    description: "Sent when the default payment card is expiring soon.",
    defaultSubject: "Your OrzuX payment card is expiring soon",
  },
];

export function getEmailTemplateDefinition(
  templateId: string,
): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATE_REGISTRY.find((entry) => entry.id === templateId);
}
