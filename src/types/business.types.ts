import { z } from "zod";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value ?? "");

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .transform((value) => value ?? "")
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  );

const optionalWebsite = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => value ?? "")
  .refine((value) => {
    if (value === "") {
      return true;
    }

    return z.string().url().safeParse(value).success;
  }, "Enter a valid website URL.");

export const businessProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters.")
    .max(100, "Business name must be at most 100 characters."),
  businessDescription: optionalText(1000),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(200),
  website: optionalWebsite,
});

export const createBusinessSchema = businessProfileSchema;

export const updateBusinessSchema = businessProfileSchema.extend({
  businessId: z.string().uuid("Invalid business identifier."),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export type BusinessPayload = {
  businessName: string;
  businessDescription: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

export type BusinessErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "UNAUTHORIZED"
  | "ALREADY_EXISTS"
  | "NOT_FOUND"
  | "CREATE_FAILED"
  | "UPDATE_FAILED"
  | "LOGO_UPLOAD_FAILED"
  | "LOGO_INVALID";

export type BusinessActionError = {
  code: BusinessErrorCode;
  message: string;
};

export type BusinessActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: BusinessActionError };

export type BusinessProfileData = {
  id: string;
  businessName: string;
  businessDescription: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
};

export type CreateBusinessResult = BusinessActionResult<BusinessProfileData>;
export type UpdateBusinessResult = BusinessActionResult<BusinessProfileData>;
export type UploadBusinessLogoResult = BusinessActionResult<{ logoUrl: string }>;

export const BUSINESS_LOGO_FIELD = "logo" as const;

export const ALLOWED_BUSINESS_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_BUSINESS_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
