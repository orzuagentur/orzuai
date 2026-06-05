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
});

export const sendPasswordResetEmailSchema = z.object({
  to: emailAddressSchema,
  resetUrl: urlSchema,
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
