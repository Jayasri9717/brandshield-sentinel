import type { BrandProfileData, PageId, ProfileExtras, Severity } from "../types";

export const initialProfile: BrandProfileData = {
  name: "Acme Financial",
  industry: "Fintech & digital banking",
  region: "North America",
  description: "Digital banking services and customer support. Use this context to help analysts review possible impersonation signals.",
};

export const initialProfileExtras: ProfileExtras = {
  domains: [],
  accounts: [],
  appIds: [],
  logoAsset: null,
};

export const navigation: { id: PageId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "profile", label: "Brand profile", icon: "shield" },
  { id: "social", label: "Social monitor", icon: "users" },
  { id: "apps", label: "App monitor", icon: "apps" },
  { id: "domains", label: "Lookalike domains", icon: "globe" },
];

export const findings: {
  name: string;
  channel: string;
  evidence: string;
  severity: Severity;
  age: string;
}[] = [
  {
    name: "Acme Financial Helpdesk",
    channel: "Social profile",
    evidence: "Unverified account using a similar handle",
    severity: "Critical",
    age: "12 min ago",
  },
  {
    name: "acme-secure-login.com",
    channel: "Lookalike domain",
    evidence: "New domain with a sign-in page",
    severity: "High",
    age: "48 min ago",
  },
  {
    name: "Acme Pay — Quick Transfer",
    channel: "Mobile app",
    evidence: "Unverified publisher and copied branding",
    severity: "High",
    age: "2 hrs ago",
  },
];

export const socialProfiles = [
  { name: "Acme Financial Helpdesk", handle: "@AcmeFin_Helpdesk", platform: "X", followers: "1,248", similarity: "94%" },
  { name: "Acme Global VIP Support", handle: "@acme_vip_agent", platform: "Instagram", followers: "450", similarity: "87%" },
  { name: "Acme Careers", handle: "@acme-careers-portal", platform: "LinkedIn", followers: "210", similarity: "72%" },
];

export const mobileApps = [
  { name: "Acme Pay — Quick Transfer", publisher: "AcmeGlobal Digital Apps LLC", store: "Google Play", risk: "High", packageId: "com.acme.financial.fake" },
  { name: "Acme Financial: Fast Loans", publisher: "QuickFinance Tech Ltd", store: "APK mirror", risk: "Critical", packageId: "com.acmepay.loan.secure" },
  { name: "Acme Safe Banking Boost", publisher: "AppPulse Studio", store: "Third-party store", risk: "Medium", packageId: "com.acme.utility.optimizer" },
];

export const domains = [
  { domain: "acme-secure-login.com", vector: "Typosquat", registrar: "NameCheap Inc.", score: 98, status: "Active" },
  { domain: "acme-finance.co", vector: "Homoglyph", registrar: "Porkbun LLC", score: 91, status: "Active" },
  { domain: "secure-acme-login.net", vector: "Combosquat", registrar: "Tucows Domains", score: 84, status: "Observed" },
  { domain: "acmefinancial.help", vector: "Phishing landing page", registrar: "PublicDomainReg", score: 76, status: "Observed" },
];
