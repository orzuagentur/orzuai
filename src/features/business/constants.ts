export const BUSINESS_MESSAGES = {
  createTitle: "Create Business Profile",
  createDescription:
    "Set up your business details to personalize your AI WhatsApp assistant.",
  editTitle: "Business Settings",
  editDescription:
    "Update your business information, logo, and contact details.",
  createSuccess: "Business profile created successfully.",
  updateSuccess: "Business profile updated successfully.",
  logoUploadSuccess: "Business logo uploaded successfully.",
  alreadyExists: "You already have a business profile.",
  notFound: "Business profile not found.",
  genericError: "Unable to save business profile. Please try again.",
  logoGenericError: "Unable to upload logo. Please try again.",
  logoInvalidType: "Logo must be a JPEG, PNG, WebP, or GIF image.",
  logoTooLarge: "Logo must be 2 MB or smaller.",
  logoRequiresBusiness:
    "Create your business profile before uploading a logo.",
  missingConfig:
    "Business services are not configured. Missing required environment variables.",
} as const;

export const DEFAULT_AI_LANGUAGE = "English";

export const DEFAULT_AI_SYSTEM_PROMPT =
  "You are a helpful WhatsApp assistant for this business. Answer customer questions professionally, accurately, and in a friendly tone.";

export const BUSINESS_LOGOS_BUCKET = "business-logos";
