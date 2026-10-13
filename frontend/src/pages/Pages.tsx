import { lazy, Suspense, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { DetectionStatus } from "../components/DetectionStatus";
import { PageHeading } from "../components/PageHeading";
import { StatCard } from "../components/StatCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { detectApps, detectDomains, detectSocial } from "../services/api";
import { getApiErrorMessage } from "../services/http";
import type { AppDetection, AuthFormValues, AuthMode, BrandProfileData, DetectionResponse, DomainDetection, PageId, ProfileExtras, SocialDetection } from "../types";
import { domains, findings, mobileApps, socialProfiles } from "../utils/demoData";
import { appCandidates, domainCandidates, socialCandidates } from "../utils/candidates";

const ThreatChart = lazy(() => import("../components/ThreatChart").then((module) => ({ default: module.ThreatChart })));

export function AuthScreen({
  mode,
  message,
  submitting,
  onModeChange,
  onSubmit,
  onClose,
}: {
  mode: AuthMode;
  message: string;
  submitting: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (mode: AuthMode, values: AuthFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(mode, { name, email, password });
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <button className="auth-back subtle-button" type="button" onClick={onClose}>Back to dashboard</button>
        <span className="brand-mark"><Icon name="shield" size={18} /></span>
        <p className="eyebrow">BRANDSHIELD SENTINEL</p>
        <h1>{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-description">{mode === "register" ? "Create an optional account. Guest profile and candidate analysis features work without signing in." : "Sign in to your separate account, or return to the workspace and continue as a guest."}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && <div><label className="field-label" htmlFor="auth-name">Name</label><input id="auth-name" className="form-control" autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} /></div>}
          <div><label className="field-label" htmlFor="auth-email">Email</label><input id="auth-email" className="form-control" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div><label className="field-label" htmlFor="auth-password">Password</label><input id="auth-password" className="form-control" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : 1} maxLength={256} required value={password} onChange={(event) => setPassword(event.target.value)} />{mode === "register" && <small className="auth-hint">Use at least 12 characters.</small>}</div>
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to BrandShield?"} <button type="button" onClick={() => onModeChange(mode === "register" ? "login" : "register")}>{mode === "register" ? "Sign in" : "Create account"}</button></p>
        <p className="auth-footnote">Your sign-in session is managed separately from browser-saved detection profiles. Sessions expire after 12 hours.</p>
      </section>
    </main>
  );
}

export function DemoNotice() {
  return <div className="demo-notice"><span className="demo-mark">i</span><span><strong>Sample candidates</strong> — backend analysis only checks these supplied examples; no external platforms are queried.</span></div>;
}

export function Dashboard({ onNavigate, searchResults, onCreateAssessment, brandInput, setBrandInput, assessmentMessage, profileId }: { onNavigate: (page: PageId) => void; searchResults: typeof findings; onCreateAssessment: (event: FormEvent<HTMLFormElement>) => void; brandInput: string; setBrandInput: (value: string) => void; assessmentMessage: string; profileId: string | null }) {
  const { stats, error: statsError, loading: statsLoading, retry: retryStats } = useDashboardStats();
  return (
    <>
      <PageHeading eyebrow="SOC TELEMETRY · OVERVIEW" title="Brand protection" description="A calm, evidence-led view of your monitored brand and priority signals." action={<span className="demo-pill"><span className="live-dot" />Demo workspace</span>} />
      <DemoNotice />
      <section className="stats-grid" id="monitoring-summary" data-scroll-target aria-label="Monitoring summary">
        <StatCard label="Monitored brands" value={profileId ? "1" : "0"} note={profileId ? "Current browser profile" : "Configure a brand profile"} icon="shield" />
        <StatCard label="Analyzed candidates" value={statsLoading ? "…" : String(stats?.total_threats ?? 0).padStart(2, "0")} note="Across all detection runs" icon="search" />
        <StatCard label="High risk" value={statsLoading ? "…" : String(stats?.high_risk ?? 0).padStart(2, "0")} note="Risk score ≥ 70%" icon="alert" tone="critical" />
      </section>
      {statsError && <div className="api-alert" role="alert"><span>{statsError}</span><button type="button" onClick={retryStats}>Retry statistics</button></div>}
      <Suspense fallback={<section className="panel chart-empty">Loading threat chart…</section>}><ThreatChart stats={stats} /></Suspense>

      <div className="dashboard-grid">
        <section className="panel findings-panel" id="priority-findings" data-scroll-target>
          <div className="section-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Priority findings</h2></div><button className="text-button" onClick={() => onNavigate("social")}>View monitors <Icon name="arrow" size={15} /></button></div>
          <div className="finding-list">
            {searchResults.length ? searchResults.map((item) => (
              <article className="finding-row" key={item.name}>
                <span className={`severity-marker ${item.severity.toLowerCase()}`} />
                <div className="finding-main"><strong>{item.name}</strong><span>{item.channel} · {item.evidence}</span></div>
                <span className={`severity-pill ${item.severity.toLowerCase()}`}>{item.severity}</span>
                <span className="finding-age"><Icon name="clock" size={13} />{item.age}</span>
              </article>
            )) : <div className="empty-state"><Icon name="search" size={20} /><strong>No matching findings</strong><span>Try a different search term.</span></div>}
          </div>
          <div className="list-footnote"><span>Example queue · 3 of 7 sample findings</span><button className="subtle-button" onClick={() => onNavigate("domains")}>Open domain monitor <Icon name="arrow" size={14} /></button></div>
        </section>

        <section className="panel coverage-panel" id="monitoring-areas" data-scroll-target>
          <div className="section-heading"><div><p className="eyebrow">COVERAGE</p><h2>Monitoring areas</h2></div></div>
          <button className="coverage-link" onClick={() => onNavigate("social")}><span className="coverage-icon"><Icon name="users" /></span><span className="coverage-copy"><strong>Social profiles</strong><small>3 sample profiles</small></span><Icon name="arrow" size={16} /></button>
          <button className="coverage-link" onClick={() => onNavigate("apps")}><span className="coverage-icon"><Icon name="apps" /></span><span className="coverage-copy"><strong>Mobile apps</strong><small>3 sample listings</small></span><Icon name="arrow" size={16} /></button>
          <button className="coverage-link" onClick={() => onNavigate("domains")}><span className="coverage-icon"><Icon name="globe" /></span><span className="coverage-copy"><strong>Lookalike domains</strong><small>4 sample domains</small></span><Icon name="arrow" size={16} /></button>
          <div className="coverage-footer"><span className="status-check"><Icon name={profileId ? "check" : "plus"} size={13} /></span>{profileId ? "Brand profile configured" : "No brand profile yet"} <button onClick={() => onNavigate("profile")}>{profileId ? "Review" : "Configure"}</button></div>
        </section>
      </div>

      <section className="panel assessment-panel" id="demo-assessment" data-scroll-target>
        <div className="assessment-intro"><span className="assessment-icon"><Icon name="plus" size={20} /></span><div><h2>Explore a demo assessment</h2><p>Preview the workflow with sample data. This does not start a real scan.</p></div></div>
        <form className="assessment-form" onSubmit={onCreateAssessment}><label className="sr-only" htmlFor="assessment-brand">Brand name</label><input id="assessment-brand" value={brandInput} onChange={(event) => setBrandInput(event.target.value)} placeholder="Enter a brand or organization" /><button className="primary-button" type="submit">Prepare demo <Icon name="arrow" size={15} /></button></form>
        {assessmentMessage && <p className="inline-feedback" role="status">{assessmentMessage}</p>}
      </section>
    </>
  );
}

export type BrandProfileProps = {
  profile: BrandProfileData;
  draft: BrandProfileData;
  onDraftChange: (draft: BrandProfileData) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saved: boolean;
  extras: ProfileExtras;
  onExtrasChange: (extras: ProfileExtras) => void;
  apiMessage: string;
  loading: boolean;
  saving: boolean;
  loadError: boolean;
  onRetryLoad: () => void;
};

export function BrandProfile({ profile, draft, onDraftChange, onSave, saved, extras, onExtrasChange, apiMessage, loading, saving, loadError, onRetryLoad }: BrandProfileProps) {
  const [domainFormOpen, setDomainFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [accountPlatform, setAccountPlatform] = useState("X");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [appIdInput, setAppIdInput] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  function addDomain() {
    const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
    const labels = domain.split(".");
    const valid = domain.length <= 253
      && labels.length >= 2
      && labels.every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
      && /^[a-z]{2,63}$/.test(labels[labels.length - 1]);
    if (!valid) {
      setEditorMessage("Enter a valid domain name, such as example.com.");
      return;
    }
    if (extras.domains.some((item) => item.domain.toLowerCase() === domain)) {
      setEditorMessage("That domain is already in the profile.");
      return;
    }
    onExtrasChange({ ...extras, domains: [...extras.domains, { domain, note: "Added to profile", verified: false }] });
    setDomainInput("");
    setDomainFormOpen(false);
    setEditorMessage("");
  }

  function addAccount() {
    const identifier = accountIdentifier.trim();
    if (!identifier) {
      setEditorMessage("Enter an account handle or profile URL.");
      return;
    }
    if (extras.accounts.some((account) => account.platform === accountPlatform && account.identifier.toLowerCase() === identifier.toLowerCase())) {
      setEditorMessage("That account is already in the profile.");
      return;
    }
    onExtrasChange({ ...extras, accounts: [...extras.accounts, { platform: accountPlatform, identifier, verified: false }] });
    setAccountIdentifier("");
    setAccountFormOpen(false);
    setEditorMessage("");
  }

  function addAppId() {
    const appId = appIdInput.trim();
    if (!appId) {
      setEditorMessage("Enter an official app package ID.");
      return;
    }
    if (extras.appIds.some((existing) => existing.toLowerCase() === appId.toLowerCase())) {
      setEditorMessage("That app ID is already in the profile.");
      return;
    }
    onExtrasChange({ ...extras, appIds: [...extras.appIds, appId] });
    setAppIdInput("");
    setEditorMessage("");
  }

  function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setEditorMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setEditorMessage("Logo files must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setEditorMessage("The selected logo could not be read. Please try another file.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setEditorMessage("The selected logo could not be read. Please try another file.");
        return;
      }
      onExtrasChange({ ...extras, logoAsset: { name: file.name, dataUrl: reader.result } });
      setEditorMessage("");
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <PageHeading eyebrow="BRAND CONFIGURATION · PROFILE" title="Brand profile" description="Manage the official identifiers used to contextualize potential impersonation signals." action={<span className="demo-pill"><span className="live-dot" />Profile preview</span>} />
      <DemoNotice />
      <form onSubmit={onSave} className="profile-layout">
        <section className="panel profile-panel">
          <div className="section-heading"><div><p className="eyebrow">CORE IDENTITY</p><h2>Brand details</h2></div><span className="quiet-badge">API-backed profile</span></div>
          <label className="field-label" htmlFor="brand-name">Brand or legal trading name</label>
          <input id="brand-name" className="form-control" value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} required pattern=".*\S.*" title="Enter a brand name with at least one non-space character." />
          <div className="form-two-column"><div><label className="field-label" htmlFor="industry">Industry</label><select id="industry" className="form-control" value={draft.industry} onChange={(event) => onDraftChange({ ...draft, industry: event.target.value })}><option>Fintech &amp; digital banking</option><option>Retail</option><option>Healthcare</option><option>Other</option></select></div><div><label className="field-label" htmlFor="jurisdiction">Primary region</label><select id="jurisdiction" className="form-control" value={draft.region} onChange={(event) => onDraftChange({ ...draft, region: event.target.value })}><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Global</option></select></div></div>
          <label className="field-label" htmlFor="brand-description">Brand description</label>
          <textarea id="brand-description" className="form-control textarea" value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} rows={4} />
          <div className="field-helper">This description is used as context in the demo only.</div>
          <div className="form-divider" />
          <div className="section-heading subsection-heading"><div><p className="eyebrow">OFFICIAL WEB PRESENCE</p><h2>Official domains</h2></div><button type="button" className="subtle-button" aria-expanded={domainFormOpen} onClick={() => { setDomainFormOpen((open) => !open); setEditorMessage(""); }}><Icon name="plus" size={14} />Add domain</button></div>
          {domainFormOpen && <div className="inline-add-row"><label className="sr-only" htmlFor="new-domain">Domain name</label><input id="new-domain" className="form-control" value={domainInput} onChange={(event) => setDomainInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDomain(); } }} placeholder="example.com" /><button type="button" className="secondary-button" onClick={addDomain}>Add</button></div>}
          {extras.domains.map((domain) => <div className="domain-chip" key={domain.domain}><Icon name="globe" size={16} /><span><strong>{domain.domain}</strong><small>{domain.note}</small></span><span className="verified-label">{domain.verified ? <><Icon name="check" size={13} />Verified</> : "Configured"}</span></div>)}
          <div className="form-divider" />
          <div className="section-heading subsection-heading"><div><p className="eyebrow">OFFICIAL APPS</p><h2>Package IDs</h2></div></div>
          <p className="panel-description">Official package IDs are excluded from candidate app risk scoring.</p>
          <div className="inline-add-row"><label className="sr-only" htmlFor="new-app-id">Official app package ID</label><input id="new-app-id" className="form-control" value={appIdInput} onChange={(event) => setAppIdInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAppId(); } }} placeholder="com.example.app" /><button type="button" className="secondary-button" onClick={addAppId}>Add ID</button></div>
          {extras.appIds.map((appId) => <div className="domain-chip" key={appId}><Icon name="apps" size={16} /><span><strong>{appId}</strong><small>Official package ID</small></span><span className="verified-label">Configured</span><button className="subtle-button" type="button" aria-label={`Remove ${appId}`} onClick={() => onExtrasChange({ ...extras, appIds: extras.appIds.filter((id) => id !== appId) })}>Remove</button></div>)}
        </section>
        <section className="profile-side">
          <div className="panel side-panel">
            <div className="section-heading"><div><p className="eyebrow">SOCIAL FOOTPRINT</p><h2>Official accounts</h2></div><span className="quiet-badge">{extras.accounts.length} accounts</span></div>
            <p className="panel-description">Handles matching these identifiers are recognized as official during candidate analysis.</p>
            {extras.accounts.map((account) => <div className="account-row" key={`${account.platform}:${account.identifier}`}><span className="account-logo">{account.platform === "LinkedIn" ? "in" : account.platform.slice(0, 1)}</span><span><strong>{account.identifier}</strong><small>{account.platform} · official account</small></span><span className="verified-label">{account.verified ? "Verified" : "Configured"}</span></div>)}
            {accountFormOpen && <div className="account-add-row"><label className="sr-only" htmlFor="account-platform">Platform</label><select id="account-platform" className="form-control" value={accountPlatform} onChange={(event) => setAccountPlatform(event.target.value)}><option>X</option><option>Instagram</option><option>LinkedIn</option><option>Facebook</option><option>TikTok</option><option>YouTube</option><option>Other</option></select><label className="sr-only" htmlFor="account-identifier">Account handle</label><input id="account-identifier" className="form-control" value={accountIdentifier} onChange={(event) => setAccountIdentifier(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAccount(); } }} placeholder="@handle" /><button type="button" className="secondary-button" onClick={addAccount}>Add</button></div>}
            <button className="subtle-button full-width" type="button" aria-expanded={accountFormOpen} onClick={() => { setAccountFormOpen((open) => !open); setEditorMessage(""); }}><Icon name="plus" size={14} />Add official account</button>
          </div>
          <div className="panel side-panel">
            <div className="section-heading"><div><p className="eyebrow">VISUAL IDENTITY</p><h2>Brand assets</h2></div></div>
            <div className="asset-preview"><span className="asset-mark">{extras.logoAsset ? <img className="asset-image" src={extras.logoAsset.dataUrl} alt="Uploaded brand logo" /> : <Icon name="shield" size={24} />}</span><div><strong>{extras.logoAsset?.name ?? "Primary logo"}</strong><small>{extras.logoAsset ? "Logo asset · not analyzed" : "No logo uploaded"}</small></div></div>
            <input ref={logoInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} />
            <button className="upload-placeholder" type="button" onClick={() => logoInputRef.current?.click()}><Icon name="plus" size={16} />{extras.logoAsset ? "Replace logo asset" : "Add a logo asset"}</button>
          </div>
          {(editorMessage || apiMessage) && <div className="profile-editor-message" role={loadError ? "alert" : "status"}>{editorMessage || apiMessage}{loadError && <button type="button" className="subtle-button" onClick={onRetryLoad}>Retry profile load</button>}</div>}
          <div className="save-bar"><span>{saved ? <><Icon name="check" size={15} /> Profile saved to backend</> : `Currently viewing ${profile.name}`}</span><button className="primary-button" type="submit" disabled={loading || saving}>{saving ? "Saving…" : loading ? "Loading…" : "Save profile"} {!saving && !loading && <Icon name="arrow" size={15} />}</button></div>
        </section>
      </form>
    </>
  );
}

export function SocialMonitor({ search, profileId }: { search: string; profileId: string | null }) {
  const [platform, setPlatform] = useState("All platforms");
  const [result, setResult] = useState<DetectionResponse<SocialDetection> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const visible = socialProfiles.filter((profile) => `${profile.name} ${profile.handle} ${profile.platform}`.toLowerCase().includes(search) && (platform === "All platforms" || profile.platform === platform));
  const visibleDetections = result?.detections.filter((item) => `${item.display_name} ${item.profile_handle} ${item.platform} ${item.evidence}`.toLowerCase().includes(search) && (platform === "All platforms" || item.platform === platform)) ?? [];
  async function runAnalysis() {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      setResult(await detectSocial(profileId, socialCandidates));
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Could not analyze social candidates. Check the API connection and try again."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeading eyebrow="SOCIAL TELEMETRY" title="Social monitor" description="Analyze candidate social profiles against your saved brand identity." action={<button className="primary-button" disabled={!profileId || loading} onClick={() => void runAnalysis()}>{loading ? "Analyzing…" : "Analyze candidates"} <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      <DetectionStatus loading={loading} error={error} result={result} onRetry={() => void runAnalysis()} />
      <section className="stats-grid compact-stats"><StatCard label={result ? "Analyzed profiles" : "Sample profiles"} value={String(result?.total ?? "03").padStart(2, "0")} note={result ? "Backend detection results" : "Candidate examples"} icon="users" /><StatCard label="High risk" value={String(result?.high_risk_count ?? 2).padStart(2, "0")} note="Requires analyst review" icon="alert" tone="critical" /><StatCard label="Connected platforms" value="0" note="Candidates analyzed locally" icon="globe" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">PROFILE REVIEW</p><h2>Potential impersonations</h2></div><label className="select-filter"><span className="sr-only">Filter by platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option>All platforms</option><option>X</option><option>Instagram</option><option>LinkedIn</option></select></label></div>
        <div className="table-scroll"><table><thead><tr><th>Profile</th><th>Platform</th><th>Similarity</th><th>Evidence</th><th>Review status</th></tr></thead><tbody>
          {result ? visibleDetections.map((profile) => <tr key={`${profile.platform}:${profile.profile_handle}`}><td><strong>{profile.display_name || profile.profile_handle}</strong><small>{profile.profile_handle}</small></td><td>{profile.platform}</td><td><span className={`similarity ${profile.risk_score >= 0.7 ? "high" : ""}`}>{Math.round(profile.similarity_score * 100)}%</span></td><td>{profile.evidence}</td><td><span className={`status-badge ${profile.is_official ? "active-status" : "needs-review"}`}>{profile.is_official ? "Official" : "Review"}</span></td></tr>)
            : visible.map((profile) => <tr key={profile.handle}><td><strong>{profile.name}</strong><small>{profile.handle}</small></td><td>{profile.platform}</td><td><span className={`similarity ${Number.parseInt(profile.similarity, 10) >= 85 ? "high" : ""}`}>{profile.similarity}</span></td><td>Candidate preview</td><td><span className="status-badge needs-review">Not analyzed</span></td></tr>)}
        </tbody></table></div>
        {!(result ? visibleDetections.length : visible.length) && <div className="empty-state"><Icon name="search" size={20} /><strong>No profiles found</strong><span>Adjust the platform filter or search term.</span></div>}
        <div className="table-footer"><span>{result ? `${visibleDetections.length} analyzed profiles` : `Sample candidates · ${visible.length} of ${socialProfiles.length}`}</span><span>Analysis is not a live platform scan</span></div>
      </section>
      <section className="panel note-panel"><Icon name="alert" size={18} /><p><strong>Review before action.</strong> Results are heuristic analysis of supplied candidate data, not verified live platform detections.</p></section>
    </>
  );
}

export function AppMonitor({ search, profileId }: { search: string; profileId: string | null }) {
  const [store, setStore] = useState("All sources");
  const [result, setResult] = useState<DetectionResponse<AppDetection> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const visible = mobileApps.filter((app) => `${app.name} ${app.publisher} ${app.packageId} ${app.store}`.toLowerCase().includes(search) && (store === "All sources" || app.store === store));
  const visibleDetections = result?.detections.filter((app) => `${app.app_name} ${app.publisher} ${app.package_id} ${app.source} ${app.evidence}`.toLowerCase().includes(search) && (store === "All sources" || app.source === store)) ?? [];
  async function runAnalysis() {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      setResult(await detectApps(profileId, appCandidates));
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Could not analyze app candidates. Check the API connection and try again."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeading eyebrow="MOBILE TELEMETRY" title="App monitor" description="Analyze candidate app listings against your official package IDs." action={<button className="secondary-button" disabled={!profileId || loading} onClick={() => void runAnalysis()}>{loading ? "Analyzing…" : "Analyze candidates"} <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      <DetectionStatus loading={loading} error={error} result={result} onRetry={() => void runAnalysis()} />
      <section className="stats-grid compact-stats"><StatCard label={result ? "Analyzed listings" : "Sample listings"} value={String(result?.total ?? "03").padStart(2, "0")} note={result ? "Backend detection results" : "Candidate examples"} icon="apps" /><StatCard label="High risk" value={String(result?.high_risk_count ?? 2).padStart(2, "0")} note="Requires analyst review" icon="alert" tone="critical" /><StatCard label="Stores monitored" value="0" note="Candidates analyzed locally" icon="globe" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">LISTING REVIEW</p><h2>Potentially misleading apps</h2></div><label className="select-filter"><span className="sr-only">Filter by source</span><select value={store} onChange={(event) => setStore(event.target.value)}><option>All sources</option><option>Google Play</option><option>APK mirror</option><option>Third-party store</option></select></label></div>
        <div className="table-scroll"><table><thead><tr><th>App listing</th><th>Publisher</th><th>Source</th><th>Package ID</th><th>Risk / Evidence</th></tr></thead><tbody>
          {result ? visibleDetections.map((app) => <tr key={app.package_id}><td><strong>{app.app_name}</strong><small>{app.is_official ? "Official app" : "Candidate listing"}</small></td><td>{app.publisher}</td><td>{app.source}</td><td><code className="package-id">{app.package_id}</code></td><td><span className={`severity-pill ${app.risk_score >= 0.7 ? "critical" : app.risk_score >= 0.4 ? "high" : "medium"}`}>{Math.round(app.risk_score * 100)}%</span><small>{app.evidence}</small></td></tr>)
            : visible.map((app) => <tr key={app.packageId}><td><strong>{app.name}</strong><small>Candidate preview</small></td><td>{app.publisher}</td><td>{app.store}</td><td><code className="package-id">{app.packageId}</code></td><td><span className={`severity-pill ${app.risk.toLowerCase()}`}>Not analyzed</span></td></tr>)}
        </tbody></table></div>
        {!(result ? visibleDetections.length : visible.length) && <div className="empty-state"><Icon name="search" size={20} /><strong>No app listings found</strong><span>Adjust the source filter or search term.</span></div>}
        <div className="table-footer"><span>{result ? `${visibleDetections.length} analyzed listings` : `Sample candidates · ${visible.length} of ${mobileApps.length}`}</span><span>Analysis is not a live store scan</span></div>
      </section>
    </>
  );
}

export function DomainMonitor({ search, profileId }: { search: string; profileId: string | null }) {
  const [result, setResult] = useState<DetectionResponse<DomainDetection> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const visible = domains.filter((domain) => `${domain.domain} ${domain.vector} ${domain.registrar}`.toLowerCase().includes(search));
  const visibleDetections = result?.detections.filter((domain) => `${domain.domain} ${domain.variation_type} ${domain.evidence}`.toLowerCase().includes(search)) ?? [];
  async function runAnalysis() {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      setResult(await detectDomains(profileId, domainCandidates));
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Could not analyze domain candidates. Check the API connection and try again."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeading eyebrow="DOMAIN TELEMETRY" title="Lookalike domains" description="Analyze domain candidates against the official domains in your profile." action={<button className="primary-button" disabled={!profileId || loading} onClick={() => void runAnalysis()}>{loading ? "Analyzing…" : "Analyze candidates"} <Icon name="arrow" size={15} /></button>} />
      <DemoNotice />
      <DetectionStatus loading={loading} error={error} result={result} onRetry={() => void runAnalysis()} />
      <section className="stats-grid compact-stats"><StatCard label={result ? "Analyzed domains" : "Sample domains"} value={String(result?.total ?? "04").padStart(2, "0")} note={result ? "Backend detection results" : "Candidate examples"} icon="globe" /><StatCard label="High risk" value={String(result?.high_risk_count ?? 2).padStart(2, "0")} note="Requires analyst review" icon="alert" tone="critical" /><StatCard label="DNS checks" value="0" note="No live DNS queries" icon="clock" /></section>
      <section className="panel table-panel">
        <div className="section-heading table-heading"><div><p className="eyebrow">DOMAIN REVIEW</p><h2>Observed variations</h2></div><span className="quiet-badge">Example dataset</span></div>
        <div className="table-scroll"><table><thead><tr><th>Domain</th><th>Variation type</th><th>DNS</th><th>Risk score</th><th>Evidence</th></tr></thead><tbody>
          {result ? visibleDetections.map((domain) => <tr key={domain.domain}><td><strong className="domain-name">{domain.domain}</strong><small>{domain.is_official ? "Official domain" : "Candidate domain"}</small></td><td>{domain.variation_type}</td><td>{domain.dns_resolves ? `Resolves · ${domain.http_status ?? "HTTP"}` : "Not checked"}</td><td><span className={`score ${domain.risk_score >= 0.7 ? "high" : ""}`}>{Math.round(domain.risk_score * 100)}<small>/100</small></span></td><td>{domain.evidence}</td></tr>)
            : visible.map((domain) => <tr key={domain.domain}><td><strong className="domain-name">{domain.domain}</strong><small>Candidate preview</small></td><td>{domain.vector}</td><td>Not checked</td><td><span className={`score ${domain.score >= 90 ? "high" : ""}`}>{domain.score}<small>/100</small></span></td><td>Not analyzed</td></tr>)}
        </tbody></table></div>
        {!(result ? visibleDetections.length : visible.length) && <div className="empty-state"><Icon name="search" size={20} /><strong>No domains found</strong><span>Try another domain or variation type.</span></div>}
        <div className="table-footer"><span>{result ? `${visibleDetections.length} analyzed domains` : `Sample candidates · ${visible.length} of ${domains.length}`}</span><span>Backend checks similarity only; no DNS request is made</span></div>
      </section>
      <section className="panel note-panel"><Icon name="alert" size={18} /><p><strong>Interpret results carefully.</strong> Backend candidate analysis uses name similarity; no DNS, registrar, or web-content checks are performed.</p></section>
    </>
  );
}
