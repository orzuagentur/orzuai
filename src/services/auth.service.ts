import "server-only";

import type { EmailOtpType, User } from "@supabase/supabase-js";

import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import {
  ACCOUNT_DELETION_MESSAGES,
  LOGIN_MESSAGES,
  PASSWORD_RESET_MESSAGES,
  REGISTRATION_MESSAGES,
  VERIFICATION_MESSAGES,
} from "@/features/auth/constants";
import { BUSINESS_LOGOS_BUCKET } from "@/features/business/constants";
import { hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/services/email.service";
import type {
  DeleteAccountInput,
  DeleteAccountResult,
  LoginResult,
  PasswordResetRequestResult,
  PasswordUpdateResult,
  RegisterWithEmailPayload,
  RegistrationResult,
  RequestPasswordResetInput,
  ResendVerificationEmailInput,
  ResetPasswordPayload,
  SignInWithEmailInput,
  VerificationResult,
} from "@/types/auth.types";
import {
  deleteAccountSchema,
  registerWithEmailInputSchema,
  requestPasswordResetSchema,
  resendVerificationEmailSchema,
  resetPasswordInputSchema,
  signInWithEmailSchema,
} from "@/types/auth.types";
import type { AuthActionResult } from "@/types/auth.types";
import { buildAuthCallbackUrl } from "@/utils/auth";

function missingConfigRegistrationError(): RegistrationResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message:
        "Authentication services are not configured. Missing required environment variables.",
    },
  };
}

function missingConfigLoginError(): LoginResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message:
        "Authentication services are not configured. Missing required environment variables.",
    },
  };
}

function missingConfigPasswordResetError(): PasswordResetRequestResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message:
        "Authentication services are not configured. Missing required environment variables.",
    },
  };
}

function isExistingUserError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  );
}

function isEmailNotVerifiedError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not verified")
  );
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

export async function registerWithEmail(
  input: RegisterWithEmailPayload,
): Promise<RegistrationResult> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return missingConfigRegistrationError();
  }

  const parsed = registerWithEmailInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const admin = createAdminClient();
  const redirectTo = buildAuthCallbackUrl(APP_ROUTES.dashboard);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      redirectTo,
    },
  });

  if (error) {
    return {
      success: false,
      error: {
        code: "REGISTRATION_FAILED",
        message: isExistingUserError(error.message)
          ? REGISTRATION_MESSAGES.alreadyRegistered
          : error.message || REGISTRATION_MESSAGES.genericError,
      },
    };
  }

  const verificationUrl = data.properties.action_link;

  if (!verificationUrl) {
    return {
      success: false,
      error: {
        code: "REGISTRATION_FAILED",
        message: REGISTRATION_MESSAGES.genericError,
      },
    };
  }

  const emailResult = await sendVerificationEmail({
    to: parsed.data.email,
    verificationUrl,
  });

  if (!emailResult.success) {
    if (data.user?.id) {
      await admin.auth.admin.deleteUser(data.user.id);
    }

    return {
      success: false,
      error: {
        code: "EMAIL_FAILED",
        message: emailResult.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      email: parsed.data.email,
    },
  };
}

export async function verifyEmailWithTokenHash(
  tokenHash: string,
  type: EmailOtpType,
): Promise<AuthActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error:
        "Authentication services are not configured. Missing required environment variables.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return {
      success: false,
      error: error.message || VERIFICATION_MESSAGES.invalidLink,
    };
  }

  return { success: true };
}

export async function resendVerificationEmail(
  input: ResendVerificationEmailInput,
): Promise<VerificationResult> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message:
          "Authentication services are not configured. Missing required environment variables.",
      },
    };
  }

  const parsed = resendVerificationEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const admin = createAdminClient();
  const redirectTo = buildAuthCallbackUrl(APP_ROUTES.dashboard);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("not found") || normalized.includes("no user")) {
      return {
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: VERIFICATION_MESSAGES.resendFailed,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "VERIFICATION_FAILED",
        message: error.message || VERIFICATION_MESSAGES.resendFailed,
      },
    };
  }

  const verificationUrl = data.properties.action_link;

  if (!verificationUrl) {
    return {
      success: false,
      error: {
        code: "VERIFICATION_FAILED",
        message: VERIFICATION_MESSAGES.resendFailed,
      },
    };
  }

  const emailResult = await sendVerificationEmail({
    to: parsed.data.email,
    verificationUrl,
  });

  if (!emailResult.success) {
    return {
      success: false,
      error: {
        code: "EMAIL_FAILED",
        message: emailResult.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      email: parsed.data.email,
    },
  };
}

export async function signInWithEmail(
  input: SignInWithEmailInput,
): Promise<LoginResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigLoginError();
  }

  const parsed = signInWithEmailSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (isEmailNotVerifiedError(error.message)) {
      return {
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: LOGIN_MESSAGES.emailNotVerified,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: LOGIN_MESSAGES.invalidCredentials,
      },
    };
  }

  if (!data.user.email) {
    return {
      success: false,
      error: {
        code: "LOGIN_FAILED",
        message: LOGIN_MESSAGES.genericError,
      },
    };
  }

  return {
    success: true,
    data: {
      email: data.user.email,
    },
  };
}

export async function signOut(): Promise<AuthActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error:
        "Authentication services are not configured. Missing required environment variables.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to sign out. Please try again.",
    };
  }

  return { success: true };
}

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<PasswordResetRequestResult> {
  if (!hasSupabaseEnv() || !hasResendEnv()) {
    return missingConfigPasswordResetError();
  }

  const parsed = requestPasswordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const admin = createAdminClient();
  const redirectTo = buildAuthCallbackUrl(AUTH_ROUTES.resetPassword);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    const normalized = error.message.toLowerCase();

    if (
      normalized.includes("not found") ||
      normalized.includes("no user") ||
      normalized.includes("user not found")
    ) {
      return {
        success: true,
        data: {
          email: parsed.data.email,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "RESET_FAILED",
        message: error.message || PASSWORD_RESET_MESSAGES.genericError,
      },
    };
  }

  const resetUrl = data.properties.action_link;

  if (!resetUrl) {
    return {
      success: true,
      data: {
        email: parsed.data.email,
      },
    };
  }

  const emailResult = await sendPasswordResetEmail({
    to: parsed.data.email,
    resetUrl,
  });

  if (!emailResult.success) {
    return {
      success: false,
      error: {
        code: "EMAIL_FAILED",
        message: emailResult.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      email: parsed.data.email,
    },
  };
}

export async function updatePassword(
  input: ResetPasswordPayload,
): Promise<PasswordUpdateResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message:
          "Authentication services are not configured. Missing required environment variables.",
      },
    };
  }

  const parsed = resetPasswordInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: {
        code: "INVALID_SESSION",
        message: PASSWORD_RESET_MESSAGES.invalidSession,
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: {
        code: "RESET_FAILED",
        message: error.message || PASSWORD_RESET_MESSAGES.genericError,
      },
    };
  }

  return { success: true };
}

async function cleanupUserStorage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { data: businessFolders } = await admin.storage
    .from(BUSINESS_LOGOS_BUCKET)
    .list(userId);

  if (!businessFolders?.length) {
    return;
  }

  const paths: string[] = [];

  for (const folder of businessFolders) {
    const folderPath = `${userId}/${folder.name}`;
    const { data: files } = await admin.storage
      .from(BUSINESS_LOGOS_BUCKET)
      .list(folderPath);

    for (const file of files ?? []) {
      paths.push(`${folderPath}/${file.name}`);
    }
  }

  if (paths.length > 0) {
    await admin.storage.from(BUSINESS_LOGOS_BUCKET).remove(paths);
  }
}

export async function deleteAccount(
  input: DeleteAccountInput,
): Promise<DeleteAccountResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message:
          "Authentication services are not configured. Missing required environment variables.",
      },
    };
  }

  const parsed = deleteAccountSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ??
          ACCOUNT_DELETION_MESSAGES.genericError,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: ACCOUNT_DELETION_MESSAGES.genericError,
      },
    };
  }

  const admin = createAdminClient();

  try {
    await cleanupUserStorage(admin, user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return {
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: error.message || ACCOUNT_DELETION_MESSAGES.genericError,
        },
      };
    }

    await supabase.auth.signOut();

    return { success: true };
  } catch {
    return {
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: ACCOUNT_DELETION_MESSAGES.genericError,
      },
    };
  }
}
