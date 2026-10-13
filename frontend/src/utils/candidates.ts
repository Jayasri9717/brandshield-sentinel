import type { AppCandidate, SocialCandidate } from "../types";
import { mobileApps, socialProfiles } from "./demoData";

export const socialCandidates: SocialCandidate[] = socialProfiles.map((profile) => ({
  platform: profile.platform,
  handle: profile.handle,
  display_name: profile.name,
  bio: "",
  profile_image_url: null,
}));

export const appCandidates: AppCandidate[] = mobileApps.map((app) => ({
  app_name: app.name,
  publisher: app.publisher,
  package_id: app.packageId,
  source: app.store,
  description: app.name,
  icon_url: null,
}));

export const domainCandidates = [
  "acme-secure-login.com",
  "acme-finance.co",
  "secure-acme-login.net",
  "acmefinancial.help",
];
