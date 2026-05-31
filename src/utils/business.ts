import type { Business } from "@/types/database.types";
import type { BusinessProfileData } from "@/types/business.types";

export function mapBusinessToProfile(business: Business): BusinessProfileData {
  return {
    id: business.id,
    businessName: business.business_name,
    businessDescription: business.business_description,
    phone: business.phone,
    email: business.email,
    address: business.address,
    website: business.website,
    logoUrl: business.logo_url,
  };
}

export function getBusinessLogoExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export function buildBusinessLogoPath(
  userId: string,
  businessId: string,
  extension: string,
): string {
  return `${userId}/${businessId}/logo.${extension}`;
}

export function emptyStringToNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}
