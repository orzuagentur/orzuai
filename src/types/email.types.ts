import { z } from "zod";

export const emailAddressSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .max(320, "Email address is too long");

export const urlSchema = z
  .string()
  .trim()
  .url("Invalid URL")
  .max(2048, "URL is too long");

export const sendVerificationEmailSchema = z.object({
  to: emailAddressSchema,
  verificationUrl: urlSchema,
  verificationCode: z.string().trim().min(4).max(12).optional().nullable(),
});

export const sendPasswordResetEmailSchema = z.object({
  to: emailAddressSchema,
  resetUrl: urlSchema,
  resetCode: z.string().trim().min(4).max(12).optional().nullable(),
});

export const sendLeadFollowUpEmailSchema = z.object({
  to: emailAddressSchema,
  businessName: z.string().trim().min(1).max(200),
  recipientName: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(8000),
});

export const sendOnboardingDripEmailSchema = z.object({
  to: emailAddressSchema,
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(100_000),
  templateId: z.string().trim().min(1).max(80).optional(),
});

export const sendMagicLinkEmailSchema = z.object({
  to: emailAddressSchema,
  signInUrl: urlSchema,
  signInCode: z.string().trim().min(4).max(12).optional().nullable(),
});

export const sendTeamInviteEmailSchema = z.object({
  to: emailAddressSchema,
  businessName: z.string().trim().min(1).max(200),
  inviterName: z.string().trim().max(200).optional().nullable(),
  roleLabel: z.string().trim().min(1).max(100),
  roleDescription: z.string().trim().min(1).max(500),
  permissionLabels: z.array(z.string().trim().min(1).max(100)).max(20),
  acceptUrl: urlSchema,
  authLink: urlSchema,
  expiresAt: z.string().trim().min(1),
  expiryDays: z.number().int().min(1).max(7),
});

export const sendSystemNotificationEmailSchema = z.object({
  to: emailAddressSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  actionUrl: urlSchema.optional().nullable(),
  actionLabel: z.string().trim().min(1).max(100).optional().nullable(),
  previewText: z.string().trim().max(240).optional().nullable(),
});

export type SendVerificationEmailInput = z.infer<
  typeof sendVerificationEmailSchema
>;

export type SendPasswordResetEmailInput = z.infer<
  typeof sendPasswordResetEmailSchema
>;

export type SendLeadFollowUpEmailInput = z.infer<
  typeof sendLeadFollowUpEmailSchema
>;

export type SendOnboardingDripEmailInput = z.infer<
  typeof sendOnboardingDripEmailSchema
>;

export type SendMagicLinkEmailInput = z.infer<typeof sendMagicLinkEmailSchema>;

export type SendTeamInviteEmailInput = z.infer<typeof sendTeamInviteEmailSchema>;

export type SendSystemNotificationEmailInput = z.infer<
  typeof sendSystemNotificationEmailSchema
>;

export type EmailSendSuccess = {
  id: string;
};

export type EmailServiceErrorCode =
  | "VALIDATION_ERROR"
  | "SEND_FAILED"
  | "MISSING_CONFIG";

export type EmailServiceResult =
  | { success: true; data: EmailSendSuccess }
  | {
      success: false;
      error: {
        code: EmailServiceErrorCode;
        message: string;
      };
    };
