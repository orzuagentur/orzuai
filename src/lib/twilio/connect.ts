import "server-only";

/**
 * @deprecated Import from `@/lib/twilio/platform` instead.
 * Kept as a thin re-export so existing imports keep compiling during cleanup.
 */
export {
  getTwilioPlatformAccountSid,
  getTwilioPlatformAuthToken,
  hasTwilioPlatformEnv,
} from "@/lib/twilio/platform";
