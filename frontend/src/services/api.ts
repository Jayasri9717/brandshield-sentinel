import type {
  AppCandidate,
  AppDetection,
  DashboardStats,
  DetectionProfile,
  DetectionProfilePayload,
  DetectionResponse,
  DomainDetection,
  SocialCandidate,
  SocialDetection,
} from "../types";
import { api } from "./http";

export async function checkApiHealth(signal: AbortSignal): Promise<{ status?: string }> {
  const response = await api.get<{ status?: string }>("/health", { signal });
  return response.data;
}

const activeProfileKey = "brandshield-detection-profile";

export function getActiveProfileId(): string | null {
  try {
    return window.localStorage.getItem(activeProfileKey);
  } catch {
    return null;
  }
}

export function forgetActiveProfile(): void {
  try {
    window.localStorage.removeItem(activeProfileKey);
  } catch {
    // Ignore storage restrictions and allow the current view to continue.
  }
}

export function storeActiveProfileId(id: string): boolean {
  try {
    window.localStorage.setItem(activeProfileKey, id);
    return true;
  } catch {
    return false;
  }
}

export async function createDetectionProfile(payload: DetectionProfilePayload): Promise<DetectionProfile> {
  const response = await api.post<DetectionProfile>("/brand-profile", payload);
  return response.data;
}

export async function loadDetectionProfile(id: string, signal?: AbortSignal): Promise<DetectionProfile> {
  const response = await api.get<DetectionProfile>(`/brand-profile/${encodeURIComponent(id)}`, { signal });
  return response.data;
}

export async function detectSocial(
  brandProfileId: string,
  profiles: SocialCandidate[],
): Promise<DetectionResponse<SocialDetection>> {
  const response = await api.post<DetectionResponse<SocialDetection>>("/social/detect", { brand_profile_id: brandProfileId, profiles });
  return response.data;
}

export async function detectApps(
  brandProfileId: string,
  apps: AppCandidate[],
): Promise<DetectionResponse<AppDetection>> {
  const response = await api.post<DetectionResponse<AppDetection>>("/app/detect", { brand_profile_id: brandProfileId, apps });
  return response.data;
}

export async function detectDomains(
  brandProfileId: string,
  candidates: string[],
): Promise<DetectionResponse<DomainDetection>> {
  const response = await api.post<DetectionResponse<DomainDetection>>("/lookalike/detect", { brand_profile_id: brandProfileId, candidates });
  return response.data;
}

export async function getDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  const response = await api.get<DashboardStats>("/dashboard/stats", { signal });
  return response.data;
}
