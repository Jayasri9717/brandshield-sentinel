import type { BrandProfileData, DetectionProfile, DetectionProfilePayload, ProfileExtras } from "../types";

export function toDetectionProfile(
  profile: BrandProfileData,
  extras: ProfileExtras,
): DetectionProfilePayload {
  return {
    brand_name: profile.name.trim(),
    industry: profile.industry,
    region: profile.region,
    description: profile.description,
    logo_base64: extras.logoAsset?.dataUrl.split(",")[1] ?? null,
    verified_domains: extras.domains.map(({ domain }) => domain),
    social_accounts: extras.accounts.map(({ identifier }) => identifier),
    app_ids: extras.appIds,
  };
}

function logoDataUrl(encoded: string | null): string | null {
  if (!encoded) return null;
  const mimeType = encoded.startsWith("/9j/")
    ? "image/jpeg"
    : encoded.startsWith("UklGR")
      ? "image/webp"
      : "image/png";
  return `data:${mimeType};base64,${encoded}`;
}

export function fromDetectionProfile(profile: DetectionProfile): {
  brand: BrandProfileData;
  extras: ProfileExtras;
} {
  const dataUrl = logoDataUrl(profile.logo_base64);
  return {
    brand: {
      name: profile.brand_name,
      industry: profile.industry,
      region: profile.region,
      description: profile.description,
    },
    extras: {
      domains: profile.verified_domains.map((domain) => ({ domain, note: "Configured", verified: false })),
      accounts: profile.social_accounts.map((identifier) => ({ platform: "Other", identifier, verified: false })),
      appIds: profile.app_ids,
      logoAsset: dataUrl ? { name: "Saved logo", dataUrl } : null,
    },
  };
}
