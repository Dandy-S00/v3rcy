export const LISTING_CATEGORIES = [
  "dating",
  "companionship",
  "casual",
  "social",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const VERIFICATION_STATUSES = ["none", "email", "id"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CATEGORY_REQUIREMENTS: Record<
  ListingCategory,
  VerificationStatus
> = {
  dating: "none",
  casual: "none",
  social: "none",
  companionship: "id",
};

const verificationRank: Record<VerificationStatus, number> = {
  none: 0,
  email: 1,
  id: 2,
};

export function canPublishInCategory(
  category: ListingCategory,
  verificationStatus: VerificationStatus
) {
  const required = CATEGORY_REQUIREMENTS[category];
  const allowed =
    verificationRank[verificationStatus] >= verificationRank[required];
  return {
    allowed,
    required,
    reason: allowed
      ? undefined
      : `${category === "companionship" ? "Companionship" : "This"} listings require ${required === "id" ? "ID" : "email"} verification before publication.`,
  };
}

export function isCityLevelLocation(value: string) {
  const normalized = value.trim();
  if (normalized.length < 2 || normalized.length > 80) return false;
  const looksLikeCoordinates = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/.test(
    normalized
  );
  const looksLikeAddress =
    /\b\d{1,5}\s+.+\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|suite|apt|apartment|unit)\b/i.test(
      normalized
    );
  return !looksLikeCoordinates && !looksLikeAddress;
}
