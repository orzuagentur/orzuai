import { z } from "zod";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/features/auth/constants";

export const authCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  next: z.string().trim().optional(),
  error: z.string().trim().optional(),
  error_description: z.string().trim().optional(),
});

export const authConfirmQuerySchema = z.object({
  token_hash: z.string().trim().min(1).optional(),
  type: z.enum(["signup", "email", "recovery", "invite", "magiclink"]).optional(),
  next: z.string().trim().optional(),
  error: z.string().trim().optional(),
  error_description: z.string().trim().optional(),
});

export const resendVerificationEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(320, "Email address is too long"),
});

export const signInWithEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(320, "Email address is too long"),
  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .max(PASSWORD_MAX_LENGTH, "Password is too long"),
});

export const passwordSchema = z
  .string()
  .trim()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(320, "Email address is too long"),
});

export const registerWithEmailInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(320, "Email address is too long"),
  password: passwordSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().trim().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordInputSchema = z.object({
  password: passwordSchema,
});

export const registerWithEmailSchema = registerWithEmailInputSchema
  .extend({
    confirmPassword: z.string().trim().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AuthCallbackQuery = z.infer<typeof authCallbackQuerySchema>;
export type AuthConfirmQuery = z.infer<typeof authConfirmQuerySchema>;
export type SignInWithEmailInput = z.infer<typeof signInWithEmailSchema>;
export type ResendVerificationEmailInput = z.infer<
  typeof resendVerificationEmailSchema
>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordInputSchema>;

export type RegisterWithEmailInput = z.infer<typeof registerWithEmailSchema>;

export type RegisterWithEmailPayload = z.infer<
  typeof registerWithEmailInputSchema
>;

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

export type RegistrationErrorCode =
  | "VALIDATION_ERROR"
  | "REGISTRATION_FAILED"
  | "EMAIL_FAILED"
  | "MISSING_CONFIG";

export type RegistrationResult =
  | { success: true; data: { email: string } }
  | {
      success: false;
      error: {
        code: RegistrationErrorCode;
        message: string;
      };
    };

export type LoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "MISSING_CONFIG"
  | "LOGIN_FAILED";

export type LoginResult =
  | { success: true; data: { email: string } }
  | {
      success: false;
      error: {
        code: LoginErrorCode;
        message: string;
      };
    };

export type VerificationErrorCode =
  | "VALIDATION_ERROR"
  | "VERIFICATION_FAILED"
  | "EMAIL_FAILED"
  | "MISSING_CONFIG"
  | "USER_NOT_FOUND";

export type VerificationResult =
  | { success: true; data: { email: string } }
  | {
      success: false;
      error: {
        code: VerificationErrorCode;
        message: string;
      };
    };

export type PasswordResetErrorCode =
  | "VALIDATION_ERROR"
  | "RESET_FAILED"
  | "EMAIL_FAILED"
  | "MISSING_CONFIG"
  | "INVALID_SESSION";

export type PasswordResetRequestResult =
  | { success: true; data: { email: string } }
  | {
      success: false;
      error: {
        code: PasswordResetErrorCode;
        message: string;
      };
    };

export type PasswordUpdateResult =
  | { success: true }
  | {
      success: false;
      error: {
        code: PasswordResetErrorCode;
        message: string;
      };
    };

export type AuthProviderType = "google" | "email";
